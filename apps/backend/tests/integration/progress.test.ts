import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/app.js';
import { SessionModel } from '../../src/modules/sessions/session.model.js';
import { auth } from '../../src/config/auth.js';

describe('Progress Analytics & Telemetry Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let currentAuthUserId: string | null = null;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    vi.spyOn(auth.api, 'getSession').mockImplementation(async () => {
      if (!currentAuthUserId) return null;
      return {
        session: {
          id: 'test-session-id',
          userId: currentAuthUserId,
          expiresAt: new Date(Date.now() + 3600000),
          createdAt: new Date(),
          updatedAt: new Date(),
          token: 'test-token',
        },
        user: {
          id: currentAuthUserId,
          email: `${currentAuthUserId}@pacelog.app`,
          name: `User ${currentAuthUserId}`,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any;
    });
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    await SessionModel.deleteMany({});
    currentAuthUserId = null;
  });

  describe('Telemetria ACWR & Resumo Macro', () => {
    it('GET /api/progress/overview sem autenticação deve retornar 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/progress/overview');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'UNAUTHORIZED');
    });

    it('GET /api/progress/overview deve calcular ACWR fisiológico e status sweet spot', async () => {
      currentAuthUserId = 'athlete-telemetry-1';
      const now = Date.now();

      // Inserir 4 sessões (1 por semana nos últimos 28 dias) com sRPE = 300 cada
      // Semana 1 (recente - 2 dias atrás): 300
      // Semana 2 (10 dias atrás): 300
      // Semana 3 (17 dias atrás): 300
      // Semana 4 (24 dias atrás): 300
      // Carga Aguda (7d) = 300
      // Carga Crônica (28d média) = (300 + 300 + 300 + 300) / 4 = 300
      // Ratio = 300 / 300 = 1.0 (Sweet Spot / Optimal)
      const daysOffsets = [2, 10, 17, 24];
      for (const offset of daysOffsets) {
        await SessionModel.create({
          userId: 'athlete-telemetry-1',
          sportKey: 'running',
          startedAt: new Date(now - offset * 24 * 60 * 60 * 1000),
          durationSeconds: 1800,
          rpe: 6,
          sessionalLoad: 300,
          status: 'completed',
          metrics: { distanceMeters: 5000, paceSecondsPerKm: 360 },
        });
      }

      const res = await request(app).get('/api/progress/overview');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { acwr, weeklySessionsCount, sportsBreakdown } = res.body.data;
      expect(acwr.acuteLoad).toBe(300);
      expect(acwr.chronicLoad).toBe(300);
      expect(acwr.ratio).toBe(1);
      // 'optimal' foi substituído por 'baseline' — linguagem descritiva sem termos médicos
      expect(acwr.status).toBe('baseline');
      // disclaimer obrigatório em todas as respostas de carga
      expect(acwr.disclaimer).toBeTruthy();
      expect(weeklySessionsCount).toBe(1);
      expect(sportsBreakdown).toHaveLength(1);
      expect(sportsBreakdown[0].sportKey).toBe('running');
    });
  });

  describe('Evolução por Modalidade e Recordes Pessoais (PRs)', () => {
    it('GET /api/progress/sports/:sportKey deve retornar séries temporais', async () => {
      currentAuthUserId = 'athlete-telemetry-1';

      await SessionModel.create({
        userId: 'athlete-telemetry-1',
        sportKey: 'strength',
        startedAt: new Date(),
        durationSeconds: 3600,
        rpe: 8,
        sessionalLoad: 480,
        status: 'completed',
        metrics: {
          exercises: [{ exerciseName: 'Supino Reto', sets: [{ setNumber: 1, reps: 10, weightKg: 80 }] }],
          totalVolumeKg: 4500,
        },
      });

      const res = await request(app).get('/api/progress/sports/strength');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sportKey).toBe('strength');
      expect(res.body.data.totalSessions).toBe(1);
      expect(res.body.data.sportSpecificHighlights.totalTonnageKg).toBe(4500);
    });

    it('GET /api/progress/prs deve extrair recordes pessoais das sessões do atleta', async () => {
      currentAuthUserId = 'athlete-telemetry-1';

      // Corrida 1: 5 km em pace 5:00/km (300s)
      await SessionModel.create({
        userId: 'athlete-telemetry-1',
        sportKey: 'running',
        startedAt: new Date(Date.now() - 3 * 86400000),
        durationSeconds: 1500,
        rpe: 7,
        sessionalLoad: 175,
        status: 'completed',
        metrics: { distanceMeters: 5000, paceSecondsPerKm: 300 },
      });

      // Corrida 2: 12 km (PR de distância) em pace 4:30/km (270s - PR de pace)
      await SessionModel.create({
        userId: 'athlete-telemetry-1',
        sportKey: 'running',
        startedAt: new Date(),
        durationSeconds: 3240,
        rpe: 8,
        sessionalLoad: 432,
        status: 'completed',
        metrics: { distanceMeters: 12000, paceSecondsPerKm: 270 },
      });

      const res = await request(app).get('/api/progress/prs');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const labels = res.body.data.map((pr: any) => pr.metricLabel);
      expect(labels).toContain('Maior Distância em Corrida');
    });

    it('Usuário B não deve ver PRs ou telemetria calculada a partir de sessões do Usuário A', async () => {
      currentAuthUserId = 'athlete-A';
      await SessionModel.create({
        userId: 'athlete-A',
        sportKey: 'running',
        startedAt: new Date(),
        durationSeconds: 3600,
        rpe: 9,
        sessionalLoad: 540,
        status: 'completed',
        metrics: { distanceMeters: 15000, paceSecondsPerKm: 240 },
      });

      currentAuthUserId = 'athlete-B';
      const overviewRes = await request(app).get('/api/progress/overview');
      expect(overviewRes.status).toBe(200);
      expect(overviewRes.body.data.weeklyTotalSessionalLoad).toBe(0);
      expect(overviewRes.body.data.weeklySessionsCount).toBe(0);

      const prsRes = await request(app).get('/api/progress/prs');
      expect(prsRes.status).toBe(200);
      expect(prsRes.body.data).toHaveLength(0);
    });
  });
});
