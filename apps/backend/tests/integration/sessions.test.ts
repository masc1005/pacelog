import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/app.js';
import { SessionModel } from '../../src/modules/sessions/session.model.js';
import { auth } from '../../src/config/auth.js';

describe('Sessions Module & Multi-Sport Integration Tests', () => {
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

  describe('Autenticação e Registro de Sessões', () => {
    it('POST /api/sessions sem autenticação deve retornar 401 UNAUTHORIZED', async () => {
      currentAuthUserId = null;
      const res = await request(app).post('/api/sessions').send({});
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'UNAUTHORIZED');
    });

    it('POST /api/sessions deve registrar sessão de Corrida com cálculo de carga sRPE e pace', async () => {
      currentAuthUserId = 'athlete-runner';

      const payload = {
        sportKey: 'running',
        rpe: 8,
        startedAt: new Date().toISOString(),
        metrics: {
          distanceMeters: 10000,
          durationSeconds: 3000, // 50 min
          avgHeartRate: 160,
        },
        notes: 'Treino longo com subidas',
      };

      const res = await request(app).post('/api/sessions').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.sportKey).toBe('running');
      expect(res.body.data.userId).toBe('athlete-runner');
      expect(res.body.data.durationSeconds).toBe(3000);
      expect(res.body.data.rpe).toBe(8);
      // Foster sRPE: (3000s / 60) * 8 = 50 * 8 = 400
      expect(res.body.data.sessionalLoad).toBe(400);
      // Pace: 3000 / 10 = 300 s/km
      expect(res.body.data.metrics.paceSecondsPerKm).toBe(300);
    });

    it('POST /api/sessions deve registrar sessão de Musculação com volume total calculado', async () => {
      currentAuthUserId = 'athlete-lifter';

      const payload = {
        sportKey: 'strength',
        rpe: 9,
        metrics: {
          durationSeconds: 3600, // 60 min
          exercises: [
            {
              exerciseName: 'Supino Reto',
              targetMuscleGroup: 'Peitoral',
              sets: [
                { setNumber: 1, reps: 10, weightKg: 20, isWarmup: true },
                { setNumber: 2, reps: 10, weightKg: 80, isWarmup: false }, // 800 kg
                { setNumber: 3, reps: 8, weightKg: 90, isWarmup: false }, // 720 kg
              ],
            },
          ],
        },
      };

      const res = await request(app).post('/api/sessions').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.sessionalLoad).toBe(540); // 60 * 9 = 540
      expect(res.body.data.metrics.totalVolumeKg).toBe(1520); // 800 + 720 = 1520
      expect(res.body.data.metrics.totalSets).toBe(3);
      expect(res.body.data.metrics.totalReps).toBe(28);
    });
  });

  describe('Idempotência Offline com clientUuid', () => {
    it('Reenviar a mesma sessão com o mesmo clientUuid não deve duplicar o registro no banco', async () => {
      currentAuthUserId = 'athlete-sync';
      const clientUuid = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

      const payload = {
        clientUuid,
        sportKey: 'boxing',
        rpe: 7,
        metrics: {
          roundsCount: 6,
          roundDurationSeconds: 180,
          restDurationSeconds: 60,
        },
      };

      // 1. Primeiro envio
      const res1 = await request(app).post('/api/sessions').send(payload);
      expect(res1.status).toBe(201);
      const firstId = res1.body.data.id;

      // 2. Segundo envio simulando retry de reconexão de rede
      const res2 = await request(app).post('/api/sessions').send(payload);
      expect(res2.status).toBe(201);
      const secondId = res2.body.data.id;

      // 3. IDs devem ser idênticos e o banco deve conter apenas 1 documento
      expect(firstId).toBe(secondId);

      const totalCount = await SessionModel.countDocuments({
        userId: 'athlete-sync',
        clientUuid,
      });
      expect(totalCount).toBe(1);
    });
  });

  describe('Isolamento Estrito Multi-Tenant', () => {
    it('Usuário B não deve conseguir ler, atualizar ou excluir a sessão do Usuário A', async () => {
      // 1. Usuário A cria sessão
      currentAuthUserId = 'user-a';
      const createRes = await request(app).post('/api/sessions').send({
        sportKey: 'football',
        rpe: 8,
        metrics: {
          matchType: 'society_7',
          durationSeconds: 3600,
          goals: 3,
        },
      });
      const sessionAId = createRes.body.data.id;

      // 2. Usuário B tenta ler a sessão do Usuário A -> 404 NOT FOUND
      currentAuthUserId = 'user-b';
      const getRes = await request(app).get(`/api/sessions/${sessionAId}`);
      expect(getRes.status).toBe(404);
      expect(getRes.body).toHaveProperty('error', 'SESSION_NOT_FOUND');

      // 3. Usuário B tenta atualizar a sessão do Usuário A -> 404 NOT FOUND
      const putRes = await request(app)
        .put(`/api/sessions/${sessionAId}`)
        .send({ rpe: 10 });
      expect(putRes.status).toBe(404);

      // 4. Usuário B tenta excluir a sessão do Usuário A -> 404 NOT FOUND
      const deleteRes = await request(app).delete(`/api/sessions/${sessionAId}`);
      expect(deleteRes.status).toBe(404);

      // 5. Usuário B lista suas sessões e não vê a sessão do Usuário A
      const listRes = await request(app).get('/api/sessions');
      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toHaveLength(0);

      // 6. Verificar que a sessão do Usuário A permanece intacta no banco
      currentAuthUserId = 'user-a';
      const getResA = await request(app).get(`/api/sessions/${sessionAId}`);
      expect(getResA.status).toBe(200);
      expect(getResA.body.data.metrics.goals).toBe(3);
    });
  });

  describe('Listagem, Filtros e Resumo Agregado', () => {
    it('GET /api/sessions deve paginar e filtrar por esporte', async () => {
      currentAuthUserId = 'athlete-multi';

      // Criar 2 corridas e 1 boxe
      await request(app).post('/api/sessions').send({
        sportKey: 'running',
        rpe: 6,
        metrics: { distanceMeters: 5000, durationSeconds: 1500 },
      });
      await request(app).post('/api/sessions').send({
        sportKey: 'running',
        rpe: 7,
        metrics: { distanceMeters: 8000, durationSeconds: 2400 },
      });
      await request(app).post('/api/sessions').send({
        sportKey: 'boxing',
        rpe: 8,
        metrics: { roundsCount: 4, roundDurationSeconds: 180, restDurationSeconds: 60 },
      });

      // Filtro por running
      const resRunning = await request(app).get('/api/sessions?sportKey=running');
      expect(resRunning.status).toBe(200);
      expect(resRunning.body.data).toHaveLength(2);
      expect(resRunning.body.pagination.total).toBe(2);

      // Filtro por boxing
      const resBoxing = await request(app).get('/api/sessions?sportKey=boxing');
      expect(resBoxing.status).toBe(200);
      expect(resBoxing.body.data).toHaveLength(1);
    });

    it('GET /api/sessions/summary deve retornar totais e breakdown por modalidade', async () => {
      currentAuthUserId = 'athlete-telemetry';

      // Corrida: 50 min @ RPE 8 -> Carga: 400
      await request(app).post('/api/sessions').send({
        sportKey: 'running',
        rpe: 8,
        metrics: { distanceMeters: 10000, durationSeconds: 3000 },
      });

      // Futevôlei: 60 min @ RPE 7 -> Carga: 420
      await request(app).post('/api/sessions').send({
        sportKey: 'futevolei',
        rpe: 7,
        metrics: { setsCount: 3, durationSeconds: 3600 },
      });

      const resSummary = await request(app).get('/api/sessions/summary?timeframe=week');
      expect(resSummary.status).toBe(200);

      const summary = resSummary.body.data;
      expect(summary.totalSessions).toBe(2);
      expect(summary.totalDurationSeconds).toBe(6600); // 3000 + 3600
      expect(summary.totalSessionalLoad).toBe(820); // 400 + 420
      expect(summary.averageRpe).toBe(7.5);
      expect(summary.bySport).toHaveLength(2);
    });
  });
});
