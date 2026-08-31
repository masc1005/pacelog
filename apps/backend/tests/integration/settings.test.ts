import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/app.js';
import { UserSettingsModel } from '../../src/modules/settings/settings.model.js';
import { UserSportModel } from '../../src/modules/settings/userSport.model.js';
import { ProfileModel } from '../../src/modules/profile/profile.model.js';
import { SessionModel } from '../../src/modules/sessions/session.model.js';
import { auth } from '../../src/config/auth.js';

describe('Settings & Preferences Module Integration Tests', () => {
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
    await UserSettingsModel.deleteMany({});
    await UserSportModel.deleteMany({});
    await ProfileModel.deleteMany({});
    await SessionModel.deleteMany({});
    currentAuthUserId = null;
  });

  describe('Preferências Gerais de Usuário', () => {
    it('GET /api/settings sem autenticação deve retornar 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(401);
    });

    it('GET /api/settings autenticado deve inicializar e retornar defaults (km, kg, 24h, pt-BR, dark)', async () => {
      currentAuthUserId = 'user-settings-1';
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body.userId).toBe('user-settings-1');
      expect(res.body.distanceUnit).toBe('km');
      expect(res.body.weightUnit).toBe('kg');
      expect(res.body.timeFormat).toBe('24h');
      expect(res.body.language).toBe('pt-BR');
      expect(res.body.theme).toBe('dark');
      expect(res.body.weekStart).toBe('monday');
      expect(res.body.streakGraceDays).toBe(1);
    });

    it('PATCH /api/settings deve atualizar preferências parciais com sucesso', async () => {
      currentAuthUserId = 'user-settings-1';
      const res = await request(app).patch('/api/settings').send({
        distanceUnit: 'mi',
        weightUnit: 'lb',
        theme: 'light',
        weekStart: 'sunday',
        streakGraceDays: 2,
        weeklyVolumeGoalMinutes: 300,
      });

      expect(res.status).toBe(200);
      expect(res.body.distanceUnit).toBe('mi');
      expect(res.body.weightUnit).toBe('lb');
      expect(res.body.theme).toBe('light');
      expect(res.body.weekStart).toBe('sunday');
      expect(res.body.streakGraceDays).toBe(2);
      expect(res.body.weeklyVolumeGoalMinutes).toBe(300);
    });
  });

  describe('Lembretes de Treino (Training Reminders)', () => {
    it('POST e DELETE /api/settings/reminders deve adicionar e remover lembretes', async () => {
      currentAuthUserId = 'user-settings-reminders';

      // 1. Adiciona lembrete para segunda-feira às 07:00
      const addRes = await request(app)
        .post('/api/settings/reminders')
        .send({
          weekday: 1,
          time: '07:00',
          sportKey: 'running',
          enabled: true,
        });

      expect(addRes.status).toBe(201);
      expect(addRes.body.length).toBe(1);
      expect(addRes.body[0].time).toBe('07:00');
      const reminderId = addRes.body[0].id;

      // 2. Remove lembrete pelo ID
      const delRes = await request(app).delete(`/api/settings/reminders/${reminderId}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.length).toBe(0);
    });
  });

  describe('Gestão de Esportes e Métricas Customizadas', () => {
    it('GET /api/settings/sports inicializa os 8 esportes oficiais com métricas', async () => {
      currentAuthUserId = 'user-sports-1';
      const res = await request(app).get('/api/settings/sports');

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(8);
      const running = res.body.find((s: any) => s.sportKey === 'running');
      expect(running).toBeDefined();
      expect(running.isActive).toBe(true);
      expect(running.metricsConfig.length).toBeGreaterThan(0);
    });

    it('POST /api/settings/sports/custom cria esporte personalizado', async () => {
      currentAuthUserId = 'user-sports-1';
      const res = await request(app)
        .post('/api/settings/sports/custom')
        .send({
          displayName: 'Beach Tennis',
          icon: 'Sun',
          color: '#FFB800',
        });

      expect(res.status).toBe(201);
      expect(res.body.displayName).toBe('Beach Tennis');
      expect(res.body.isCustom).toBe(true);
      expect(res.body.metricsConfig.length).toBe(3);
    });

    it('PATCH e POST restore de métricas de esporte', async () => {
      currentAuthUserId = 'user-sports-1';
      // Inicializa esportes
      await request(app).get('/api/settings/sports');

      // Modifica visibilidade
      const patchRes = await request(app)
        .patch('/api/settings/sports/running')
        .send({
          isActive: true,
          metricsConfig: [
            { metricKey: 'distanceKm', label: 'Distância (km)', visible: true, order: 0, isDefault: true, isMandatory: true },
            { metricKey: 'pace', label: 'Pace Médio', visible: false, order: 1, isDefault: true, isMandatory: false },
          ],
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.metricsConfig.find((m: any) => m.metricKey === 'pace').visible).toBe(false);

      // Restaura padrões
      const restoreRes = await request(app).post('/api/settings/sports/running/metrics/restore');
      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.metricsConfig.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Backup, Importação e Exclusão de Conta', () => {
    it('Exporta backup completo e importa em modo merge sem duplicatas', async () => {
      currentAuthUserId = 'user-backup-1';

      // Cria sessão de teste
      await SessionModel.create({
        userId: 'user-backup-1',
        clientUuid: 'uuid-12345',
        sportKey: 'running',
        startedAt: new Date('2026-08-30T10:00:00Z'),
        durationSeconds: 1800,
        rpe: 6,
        sessionalLoad: 180,
      });

      // Exporta backup
      const backupRes = await request(app).get('/api/export/backup.json');
      expect(backupRes.status).toBe(200);
      expect(backupRes.body.sessions.length).toBe(1);

      // Importa em modo merge
      const importRes = await request(app).post('/api/export/import').send({
        mode: 'merge',
        data: backupRes.body,
      });

      expect(importRes.status).toBe(200);
      expect(importRes.body.success).toBe(true);

      // Total de sessões deve continuar 1 (não duplicou)
      const count = await SessionModel.countDocuments({ userId: 'user-backup-1' });
      expect(count).toBe(1);
    });

    it('DELETE /api/profile/account exige "EXCLUIR" e limpa todos os dados do usuário', async () => {
      currentAuthUserId = 'user-delete-me';

      await ProfileModel.create({ userId: 'user-delete-me', name: 'Atleta Delete' });
      await UserSettingsModel.create({ userId: 'user-delete-me' });
      await SessionModel.create({
        userId: 'user-delete-me',
        sportKey: 'boxing',
        startedAt: new Date(),
        durationSeconds: 1200,
        rpe: 8,
        sessionalLoad: 160,
      });

      // Tentativa sem confirmação correta
      const failRes = await request(app).delete('/api/profile/account').send({ confirmation: 'nao' });
      expect(failRes.status).toBe(400);

      // Confirmação com "EXCLUIR"
      const okRes = await request(app).delete('/api/profile/account').send({ confirmation: 'EXCLUIR' });
      expect(okRes.status).toBe(200);

      // Verifica limpeza
      const profile = await ProfileModel.findOne({ userId: 'user-delete-me' });
      const settings = await UserSettingsModel.findOne({ userId: 'user-delete-me' });
      const sessions = await SessionModel.find({ userId: 'user-delete-me' });

      expect(profile).toBeNull();
      expect(settings).toBeNull();
      expect(sessions.length).toBe(0);
    });
  });
});
