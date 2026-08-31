import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/app.js';
import { GoalModel } from '../../src/modules/goals/goal.model.js';
import { SessionModel } from '../../src/modules/sessions/session.model.js';
import { auth } from '../../src/config/auth.js';

describe('Goals Module Integration Tests', () => {
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
    await GoalModel.deleteMany({});
    await SessionModel.deleteMany({});
    currentAuthUserId = null;
  });

  describe('Autenticação e CRUD de Metas', () => {
    it('POST /api/goals sem autenticação deve retornar 401 UNAUTHORIZED', async () => {
      const res = await request(app).post('/api/goals').send({
        title: 'Meta de Treino',
        metricType: 'sessions_count',
        targetValue: 5,
      });
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'UNAUTHORIZED');
    });

    it('POST /api/goals deve criar meta com sucesso', async () => {
      currentAuthUserId = 'athlete-100';

      const res = await request(app)
        .post('/api/goals')
        .send({
          title: '5 Treinos por Semana',
          metricType: 'sessions_count',
          targetValue: 5,
          unit: 'sessões',
          period: 'weekly',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe('5 Treinos por Semana');
      expect(res.body.data.currentValue).toBe(0);
      expect(res.body.data.progressPercent).toBe(0);
      expect(res.body.data.status).toBe('active');
    });

    it('POST /api/goals com clientUuid idêntico deve retornar a meta existente (idempotência offline)', async () => {
      currentAuthUserId = 'athlete-100';
      const clientUuid = 'offline-goal-uuid-123';

      const res1 = await request(app)
        .post('/api/goals')
        .send({
          clientUuid,
          title: 'Meta Offline',
          metricType: 'distance_km',
          sportKey: 'running',
          targetValue: 50,
        });
      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post('/api/goals')
        .send({
          clientUuid,
          title: 'Meta Offline Duplicada',
          metricType: 'distance_km',
          sportKey: 'running',
          targetValue: 50,
        });
      expect(res2.status).toBe(201);
      expect(res2.body.data.id).toBe(res1.body.data.id);
    });

    it('GET /api/goals deve calcular progresso em tempo real a partir das sessões', async () => {
      currentAuthUserId = 'athlete-100';

      // 1. Cria meta iniciada há 3 dias
      const goalRes = await request(app)
        .post('/api/goals')
        .send({
          title: 'Meta 20km Semanais',
          metricType: 'distance_km',
          sportKey: 'running',
          targetValue: 20,
          unit: 'km',
          period: 'weekly',
          startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        });
      const goalId = goalRes.body.data.id;

      // 2. Insere sessão de corrida de 10.5 km nos últimos 2 dias (após startDate)
      await SessionModel.create({
        userId: 'athlete-100',
        sportKey: 'running',
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        durationSeconds: 3000,
        rpe: 8,
        sessionalLoad: 400,
        status: 'completed',
        metrics: {
          distanceMeters: 10500,
          paceSecondsPerKm: 285,
        },
      });

      // 3. Consulta meta específica
      const singleRes = await request(app).get(`/api/goals/${goalId}`);
      expect(singleRes.status).toBe(200);
      expect(singleRes.body.data.currentValue).toBe(10.5);
      expect(singleRes.body.data.progressPercent).toBe(53); // (10.5 / 20) * 100 = 52.5 -> 53%
      expect(singleRes.body.data.contributingSessionsCount).toBe(1);
    });

    it('Atividades realizadas antes da criação da meta NÃO devem ser contabilizadas', async () => {
      currentAuthUserId = 'athlete-100';

      // 1. Insere sessão de 14 km realizada 10 dias atrás
      await SessionModel.create({
        userId: 'athlete-100',
        sportKey: 'running',
        startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        durationSeconds: 4000,
        rpe: 8,
        sessionalLoad: 500,
        status: 'completed',
        metrics: {
          distanceMeters: 14000,
          paceSecondsPerKm: 300,
        },
      });

      // 2. Cria meta HOJE de 40 km mensal
      const goalRes = await request(app)
        .post('/api/goals')
        .send({
          title: 'Correr 40 km no mês',
          metricType: 'distance_km',
          sportKey: 'running',
          targetValue: 40,
          unit: 'km',
          period: 'monthly',
        });
      const goalId = goalRes.body.data.id;

      // 3. Verifica que a meta criada hoje inicia com 0 km (ignorando o treino de 10 dias atrás)
      const resInitial = await request(app).get(`/api/goals/${goalId}`);
      expect(resInitial.status).toBe(200);
      expect(resInitial.body.data.currentValue).toBe(0);
      expect(resInitial.body.data.progressPercent).toBe(0);
      expect(resInitial.body.data.contributingSessionsCount).toBe(0);

      // 4. Insere novo treino realizado após a criação da meta
      await SessionModel.create({
        userId: 'athlete-100',
        sportKey: 'running',
        startedAt: new Date(),
        durationSeconds: 2000,
        rpe: 7,
        sessionalLoad: 250,
        status: 'completed',
        metrics: {
          distanceMeters: 6000,
          paceSecondsPerKm: 310,
        },
      });

      const resAfter = await request(app).get(`/api/goals/${goalId}`);
      expect(resAfter.status).toBe(200);
      expect(resAfter.body.data.currentValue).toBe(6);
      expect(resAfter.body.data.progressPercent).toBe(15);
      expect(resAfter.body.data.contributingSessionsCount).toBe(1);
    });

    it('Meta de pace com direction=decrease deve calcular progresso a partir do baseline', async () => {
      currentAuthUserId = 'athlete-100';

      // 1. Cria meta de baixar pace para 300 s/km (5:00/km) com baseline de 360 s/km (6:00/km)
      const goalRes = await request(app)
        .post('/api/goals')
        .send({
          title: 'Baixar pace para 5:00/km',
          metricType: 'average_pace_seconds_per_km',
          direction: 'decrease',
          sportKey: 'running',
          startValue: 360,
          targetValue: 300,
          period: 'monthly',
          startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        });
      const goalId = goalRes.body.data.id;

      // 2. Insere sessão com pace de 330 s/km (5:30/km) -> reduziu 30s de 60s necessários -> 50% progresso
      await SessionModel.create({
        userId: 'athlete-100',
        sportKey: 'running',
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        durationSeconds: 1800,
        rpe: 7,
        sessionalLoad: 210,
        status: 'completed',
        metrics: {
          distanceMeters: 5000,
          paceSecondsPerKm: 330,
        },
      });

      const res = await request(app).get(`/api/goals/${goalId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.currentValue).toBe(330);
      expect(res.body.data.progressPercent).toBe(50);
    });


    it('Ações de ciclo de vida: pause, resume, complete', async () => {
      currentAuthUserId = 'athlete-100';

      const createRes = await request(app)
        .post('/api/goals')
        .send({
          title: 'Meta de Ciclo de Vida',
          metricType: 'sessions_count',
          targetValue: 10,
        });
      const goalId = createRes.body.data.id;

      // Pausar
      const pauseRes = await request(app).post(`/api/goals/${goalId}/pause`);
      expect(pauseRes.status).toBe(200);
      expect(pauseRes.body.data.status).toBe('paused');

      // Retomar
      const resumeRes = await request(app).post(`/api/goals/${goalId}/resume`);
      expect(resumeRes.status).toBe(200);
      expect(resumeRes.body.data.status).toBe('active');

      // Concluir manualmente
      const completeRes = await request(app).post(`/api/goals/${goalId}/complete`);
      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.status).toBe('completed');
    });

    it('PUT /api/goals/:id deve atualizar alvo da meta', async () => {
      currentAuthUserId = 'athlete-100';

      const createRes = await request(app)
        .post('/api/goals')
        .send({
          title: '3x Boxe por Semana',
          metricType: 'sessions_count',
          sportKey: 'boxing',
          targetValue: 3,
          unit: 'sessões',
          period: 'weekly',
        });
      const goalId = createRes.body.data.id;

      const updateRes = await request(app)
        .put(`/api/goals/${goalId}`)
        .send({
          targetValue: 4,
          notes: 'Aumentado objetivo semanal',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.targetValue).toBe(4);
      expect(updateRes.body.data.notes).toBe('Aumentado objetivo semanal');
    });

    it('DELETE /api/goals/:id deve remover a meta com status 204', async () => {
      currentAuthUserId = 'athlete-100';

      const createRes = await request(app)
        .post('/api/goals')
        .send({
          title: 'Meta a ser deletada',
          metricType: 'sessions_count',
          targetValue: 2,
        });
      const goalId = createRes.body.data.id;

      const delRes = await request(app).delete(`/api/goals/${goalId}`);
      expect(delRes.status).toBe(204);

      const fetchRes = await request(app).get(`/api/goals/${goalId}`);
      expect(fetchRes.status).toBe(404);
    });
  });

  describe('Isolamento Multi-Tenant em Metas', () => {
    it('Usuário B não deve visualizar nem alterar metas do Usuário A', async () => {
      currentAuthUserId = 'athlete-A';
      const createRes = await request(app)
        .post('/api/goals')
        .send({
          title: 'Meta Privada do Atleta A',
          metricType: 'sessions_count',
          targetValue: 5,
        });
      const goalAId = createRes.body.data.id;

      // Atleta B tenta acessar a meta do Atleta A
      currentAuthUserId = 'athlete-B';
      const getRes = await request(app).get(`/api/goals/${goalAId}`);
      expect(getRes.status).toBe(404);

      const updateRes = await request(app)
        .put(`/api/goals/${goalAId}`)
        .send({ targetValue: 10 });
      expect(updateRes.status).toBe(404);

      const delRes = await request(app).delete(`/api/goals/${goalAId}`);
      expect(delRes.status).toBe(404);

      // Lista do Atleta B deve vir vazia
      const listRes = await request(app).get('/api/goals');
      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toHaveLength(0);
    });
  });
});
