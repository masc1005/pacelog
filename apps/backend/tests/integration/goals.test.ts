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
        type: 'frequency',
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
          type: 'frequency',
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

    it('GET /api/goals deve calcular progresso em tempo real a partir das sessões', async () => {
      currentAuthUserId = 'athlete-100';

      // 1. Cria meta de 20 km de corrida na semana
      const goalRes = await request(app)
        .post('/api/goals')
        .send({
          title: 'Meta 20km Semanais',
          type: 'volume',
          sportKey: 'running',
          targetValue: 20,
          unit: 'km',
          period: 'weekly',
        });
      const goalId = goalRes.body.data.id;

      // 2. Insere sessão de corrida de 10.5 km nos últimos 3 dias
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
    });

    it('PUT /api/goals/:id deve atualizar alvo da meta', async () => {
      currentAuthUserId = 'athlete-100';

      const createRes = await request(app)
        .post('/api/goals')
        .send({
          title: '3x Boxe por Semana',
          type: 'frequency',
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
          type: 'frequency',
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
          type: 'frequency',
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
