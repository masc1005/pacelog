import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/app.js';
import { ProfileModel } from '../../src/modules/profile/profile.model.js';
import { auth } from '../../src/config/auth.js';

describe('Profile Module & Authorization Integration Tests', () => {
  let mongoServer: MongoMemoryServer;

  // Variável para controlar qual usuário está autenticado na requisição
  let currentAuthUserId: string | null = null;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Spy no getSession do Better Auth para simular sessões de teste
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
    await ProfileModel.deleteMany({});
    currentAuthUserId = null;
  });

  describe('Autenticação e Acesso Básico', () => {
    it('GET /api/profile sem autenticação deve retornar 401 UNAUTHORIZED', async () => {
      currentAuthUserId = null;
      const res = await request(app).get('/api/profile');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'UNAUTHORIZED');
    });

    it('GET /api/profile com usuário autenticado deve criar e retornar perfil padrão', async () => {
      currentAuthUserId = 'user-123';
      const res = await request(app).get('/api/profile');

      expect(res.status).toBe(200);
      expect(res.body.profile).toBeDefined();
      expect(res.body.profile.userId).toBe('user-123');
      expect(res.body.profile.activeSports).toEqual(['running']);
      expect(res.body.profile.unitSystem).toBe('metric');
    });
  });

  describe('Atualizações de Perfil e Onboarding', () => {
    it('PUT /api/profile deve atualizar os dados do perfil do usuário autenticado', async () => {
      currentAuthUserId = 'athlete-abc';

      const updatePayload = {
        name: 'Carlos Corredor',
        bio: 'Maratonista sub-3h',
        weeklySessionGoal: 6,
        theme: 'dark',
      };

      const res = await request(app)
        .put('/api/profile')
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.profile.name).toBe('Carlos Corredor');
      expect(res.body.profile.bio).toBe('Maratonista sub-3h');
      expect(res.body.profile.weeklySessionGoal).toBe(6);
    });

    it('PATCH /api/profile/sports deve atualizar esportes ativos e validar esporte principal', async () => {
      currentAuthUserId = 'athlete-abc';

      // 1. Atualização válida
      const resOk = await request(app)
        .patch('/api/profile/sports')
        .send({
          activeSports: ['running', 'boxing', 'strength'],
          primarySportKey: 'boxing',
        });

      expect(resOk.status).toBe(200);
      expect(resOk.body.profile.activeSports).toEqual(['running', 'boxing', 'strength']);
      expect(resOk.body.profile.primarySportKey).toBe('boxing');

      // 2. Rejeitar esporte principal que não está nos esportes ativos
      const resInvalid = await request(app)
        .patch('/api/profile/sports')
        .send({
          activeSports: ['running', 'strength'],
          primarySportKey: 'football',
        });

      expect(resInvalid.status).toBe(400);
      expect(resInvalid.body.error).toBe('INVALID_PRIMARY_SPORT');
    });

    it('POST /api/profile/onboarding deve configurar o perfil inicial e marcar onboardingCompletedAt', async () => {
      currentAuthUserId = 'new-athlete';

      const onboardingPayload = {
        name: 'Novo Atleta Pacelog',
        activeSports: ['running', 'futevolei'],
        primarySportKey: 'futevolei',
        weeklySessionGoal: 5,
        unitSystem: 'metric',
      };

      const res = await request(app)
        .post('/api/profile/onboarding')
        .send(onboardingPayload);

      expect(res.status).toBe(200);
      expect(res.body.profile.name).toBe('Novo Atleta Pacelog');
      expect(res.body.profile.primarySportKey).toBe('futevolei');
      expect(res.body.profile.onboardingCompletedAt).toBeDefined();
      expect(new Date(res.body.profile.onboardingCompletedAt)).toBeInstanceOf(Date);
    });
  });

  describe('Isolamento Estrito de Dados entre Usuários (Autorização sem RLS)', () => {
    it('Usuário B nunca deve ler ou modificar o perfil do Usuário A', async () => {
      // 1. Criar perfil para Usuário A
      currentAuthUserId = 'user-a';
      await request(app)
        .put('/api/profile')
        .send({ name: 'Perfil Secreto do Usuário A', weeklySessionGoal: 7 });

      // 2. Usuário B faz requisição para ler o perfil
      currentAuthUserId = 'user-b';
      const resB = await request(app).get('/api/profile');

      expect(resB.status).toBe(200);
      expect(resB.body.profile.userId).toBe('user-b');
      expect(resB.body.profile.name).not.toBe('Perfil Secreto do Usuário A');

      // 3. Usuário B atualiza seu perfil
      await request(app)
        .put('/api/profile')
        .send({ name: 'Nome do Usuário B', weeklySessionGoal: 3 });

      // 4. Verificar no banco que o Usuário A permaneceu inalterado
      const profileA = await ProfileModel.findOne({ userId: 'user-a' });
      const profileB = await ProfileModel.findOne({ userId: 'user-b' });

      expect(profileA?.name).toBe('Perfil Secreto do Usuário A');
      expect(profileA?.weeklySessionGoal).toBe(7);

      expect(profileB?.name).toBe('Nome do Usuário B');
      expect(profileB?.weeklySessionGoal).toBe(3);
    });
  });
});
