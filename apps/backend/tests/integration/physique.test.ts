import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/app.js';
import { PhysiqueAssessmentModel } from '../../src/modules/physique/physique.model.js';
import { physiqueService } from '../../src/modules/physique/physique.service.js';
import { ProfileModel } from '../../src/modules/profile/profile.model.js';
import { StrengthRoutineModel } from '../../src/modules/strength/strength-routine.model.js';
import { UserSportModel } from '../../src/modules/settings/userSport.model.js';
import { WeeklyScheduleModel } from '../../src/modules/schedule/schedule.model.js';
import { auth } from '../../src/config/auth.js';

describe('Physique Assessment Module Integration Tests', () => {
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
    await Promise.all([
      PhysiqueAssessmentModel.deleteMany({}),
      ProfileModel.deleteMany({}),
      StrengthRoutineModel.deleteMany({}),
      UserSportModel.deleteMany({}),
      WeeklyScheduleModel.deleteMany({}),
    ]);
    currentAuthUserId = null;
    vi.restoreAllMocks();
    // Re-attach auth mock after restoreAllMocks
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
  });

  it('POST /api/physique/assess sem autenticação deve retornar 401', async () => {
    const res = await request(app)
      .post('/api/physique/assess')
      .send({
        images: [{ angle: 'front', base64: 'YWJjZGVmZ2hpamtsbW5vcA==', mimeType: 'image/jpeg' }],
        heightCm: 178,
        weightKg: 80,
        goal: 'hypertrophy',
      });

    expect(res.status).toBe(401);
  });

  it('POST /api/physique/assess deve validar heightCm e rejeitar valores inválidos', async () => {
    currentAuthUserId = 'athlete-1';

    const res = await request(app)
      .post('/api/physique/assess')
      .send({
        images: [{ angle: 'front', base64: 'YWJjZGVmZ2hpamtsbW5vcA==', mimeType: 'image/jpeg' }],
        heightCm: 80, // < 100 inválido
        weightKg: 80,
        goal: 'hypertrophy',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('POST /api/physique/assess deve processar de forma efêmera, persistir contexto biológico no perfil e não salvar base64', async () => {
    currentAuthUserId = 'athlete-1';

    const sampleBase64 = 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo=';
    const res = await request(app)
      .post('/api/physique/assess')
      .send({
        images: [
          { angle: 'front', base64: sampleBase64, mimeType: 'image/jpeg' },
          { angle: 'back', base64: sampleBase64, mimeType: 'image/webp' },
        ],
        heightCm: 180,
        weightKg: 81,
        goal: 'hypertrophy',
        biologicalSex: 'male',
        birthDate: '1994-05-10',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.heightCm).toBe(180);
    expect(res.body.data.weightKg).toBe(81);
    expect(res.body.data.biologicalSex).toBe('male');
    expect(res.body.data.age).toBeGreaterThanOrEqual(25);
    expect(res.body.data.result.imageQualityCheck.isAssessable).toBe(true);
    expect(res.body.data.result.anthropometryEstimate.bmi).toBe(25);
    expect(res.body.data.result.weakPoints.length).toBeGreaterThan(0);

    // Garante que nenhuma imagem / base64 foi persistida no MongoDB
    const rawDoc = await PhysiqueAssessmentModel.findById(res.body.data.id).lean();
    expect(rawDoc).toBeDefined();
    expect((rawDoc as any).images).toBeUndefined();
    expect(JSON.stringify(rawDoc)).not.toContain(sampleBase64);

    // Garante que heightCm e contexto biológico foram persistidos no perfil
    const profile = await ProfileModel.findOne({ userId: 'athlete-1' }).lean();
    expect(profile?.heightCm).toBe(180);
    expect(profile?.currentWeightKg).toBe(81);
    expect(profile?.biologicalSex).toBe('male');
    expect(profile?.birthDate).toBe('1994-05-10');
  });

  it('POST /api/physique/assess deve incluir comparisonWithPrevious na 2a avaliação válida e bloquear a 3a em 7 dias (429)', async () => {
    currentAuthUserId = 'athlete-evo';

    const first = await request(app)
      .post('/api/physique/assess')
      .send({
        images: [{ angle: 'front', base64: 'YWJjZGVmZ2hpamtsbW5vcA==', mimeType: 'image/jpeg' }],
        heightCm: 175,
        weightKg: 80,
        goal: 'definition',
        biologicalSex: 'male',
        age: 30,
      });
    expect(first.status).toBe(201);
    expect(first.body.data.result.comparisonWithPrevious).toBeUndefined();

    const second = await request(app)
      .post('/api/physique/assess')
      .send({
        images: [{ angle: 'front', base64: 'YWJjZGVmZ2hpamtsbW5vcA==', mimeType: 'image/jpeg' }],
        heightCm: 175,
        weightKg: 78.5,
        goal: 'definition',
      });
    expect(second.status).toBe(201);
    expect(second.body.data.result.comparisonWithPrevious).toBeDefined();
    expect(second.body.data.result.comparisonWithPrevious.weightDeltaKg).toBe(-1.5);
    expect(second.body.data.result.comparisonWithPrevious.daysSinceLast).toBeGreaterThanOrEqual(0);

    // 3a tentativa na janela de 7 dias deve retornar 429
    const third = await request(app)
      .post('/api/physique/assess')
      .send({
        images: [{ angle: 'front', base64: 'YWJjZGVmZ2hpamtsbW5vcA==', mimeType: 'image/jpeg' }],
        heightCm: 175,
        weightKg: 78,
        goal: 'definition',
      });
    expect(third.status).toBe(429);
    expect(third.body.error).toBe('PHYSIQUE_RATE_LIMIT_EXCEEDED');
  });

  it('POST /api/physique/assess deve retornar 422 se imageQualityCheck.isAssessable === false sem salvar no banco nem gastar cota', async () => {
    currentAuthUserId = 'athlete-quality';

    // Simula Gemini retornando imagem não avaliável (ex: roupa larga)
    (physiqueService as any).ai = {};
    const spy = vi
      .spyOn(physiqueService as any, 'callGeminiMultimodalWithTimeout')
      .mockResolvedValue({
        text: JSON.stringify({
          imageQualityCheck: {
            isAssessable: false,
            rejectionReason: 'clothing_obscured',
            userFeedback:
              'Use trajes esportivos justos (bermuda e top/sem camisa) para permitir leitura muscular.',
          },
          spatialCalibration: {
            detectedReferenceObjects: [],
            perspectiveDistortionNote: 'Não avaliável',
            calibrationConfidence: 'low',
          },
          anthropometryEstimate: {
            bmi: 24.5,
            estimatedBodyFatRange: { min: 15, max: 20 },
            waistToShoulderVisualRatio: 'Indisponível',
          },
          physiqueSummary: 'Não avaliável',
          strongPoints: [],
          weakPoints: [],
          posturalObservations: [],
          recommendedSplit: 'Indisponível',
        }),
      });

    const rejected = await request(app)
      .post('/api/physique/assess')
      .send({
        images: [{ angle: 'front', base64: 'YWJjZGVmZ2hpamtsbW5vcA==', mimeType: 'image/jpeg' }],
        heightCm: 175,
        weightKg: 75,
        goal: 'hypertrophy',
      });

    expect(rejected.status).toBe(422);
    expect(rejected.body.error).toBe('PHYSIQUE_IMAGE_NOT_ASSESSABLE');
    expect(rejected.body.details.rejectionReason).toBe('clothing_obscured');
    expect(rejected.body.details.message).toContain('trajes esportivos');

    // Garante que não salvou no banco
    expect(await PhysiqueAssessmentModel.countDocuments({ userId: 'athlete-quality' })).toBe(0);

    spy.mockRestore();
    (physiqueService as any).ai = null;

    // Nova tentativa válida ainda deve ser aceita (422 não consumiu cota)
    const ok = await request(app)
      .post('/api/physique/assess')
      .send({
        images: [{ angle: 'front', base64: 'YWJjZGVmZ2hpamtsbW5vcA==', mimeType: 'image/jpeg' }],
        heightCm: 175,
        weightKg: 75,
        goal: 'hypertrophy',
      });
    expect(ok.status).toBe(201);
  });

  it('POST /api/physique/:id/generate-plan deve respeitar availableStrengthDays, mode adapt_existing e carga multiesportiva', async () => {
    currentAuthUserId = 'athlete-plan';

    // Configura alta frequência de corrida + futevôlei na rotina semanal
    await UserSportModel.create([
      { userId: 'athlete-plan', sportKey: 'running', displayName: 'Corrida', isActive: true },
      { userId: 'athlete-plan', sportKey: 'futevolei', displayName: 'Futevôlei', isActive: true },
    ]);
    await WeeklyScheduleModel.create({
      userId: 'athlete-plan',
      days: [
        {
          weekday: 0,
          isRestDay: false,
          workouts: [{ id: 'w1', sportKey: 'running', targetDurationMinutes: 45 }],
        },
        {
          weekday: 2,
          isRestDay: false,
          workouts: [{ id: 'w2', sportKey: 'futevolei', targetDurationMinutes: 60 }],
        },
        {
          weekday: 4,
          isRestDay: false,
          workouts: [{ id: 'w3', sportKey: 'running', targetDurationMinutes: 50 }],
        },
      ],
    });

    // Ficha existente para testar modo adapt_existing
    const existing = await StrengthRoutineModel.create({
      userId: 'athlete-plan',
      name: 'Treino Antigo A',
      description: 'Antigo',
      exercises: [
        {
          exerciseKey: 'supino_reto_barra',
          exerciseNameSnapshot: 'Supino Reto',
          primaryMuscleGroup: 'peito',
          equipment: 'barbell',
          order: 0,
          sets: [{ setNumber: 1, type: 'working', reps: 10, restSeconds: 90 }],
        },
      ],
    });

    const assessRes = await request(app)
      .post('/api/physique/assess')
      .send({
        images: [{ angle: 'front', base64: 'YWJjZGVmZ2hpamtsbW5vcA==', mimeType: 'image/jpeg' }],
        heightCm: 175,
        weightKg: 76,
        goal: 'athletic',
      });

    expect(assessRes.status).toBe(201);
    const assessmentId = assessRes.body.data.id;
    const firstWeakGroup = assessRes.body.data.result.weakPoints[0].muscleGroup;

    const planRes = await request(app)
      .post(`/api/physique/${assessmentId}/generate-plan`)
      .send({
        availableStrengthDays: 2,
        mode: 'adapt_existing',
      });

    expect(planRes.status).toBe(201);
    expect(planRes.body.success).toBe(true);
    expect(planRes.body.data.routines.length).toBeGreaterThanOrEqual(1);
    expect(planRes.body.data.summary).toContain('multiesportiva');

    const adaptedRoutine = planRes.body.data.routines[0];
    expect(adaptedRoutine.id).toBe(existing.id);
    expect(adaptedRoutine.exercises[0].primaryMuscleGroup).toBe(firstWeakGroup);

    // Verifica que séries de inferiores foram moderadas (<= 3 séries por exercício) devido à corrida + futevôlei
    for (const ex of adaptedRoutine.exercises) {
      if (['quadriceps', 'posteriores', 'gluteos', 'panturrilhas'].includes(ex.primaryMuscleGroup)) {
        expect(ex.sets.length).toBeLessThanOrEqual(3);
      }
    }
  });

  it('Isolamento de usuário: atleta B não pode acessar avaliação ou gerar plano do atleta A', async () => {
    currentAuthUserId = 'athlete-a';
    const assessRes = await request(app)
      .post('/api/physique/assess')
      .send({
        images: [{ angle: 'front', base64: 'YWJjZGVmZ2hpamtsbW5vcA==', mimeType: 'image/jpeg' }],
        heightCm: 175,
        weightKg: 75,
        goal: 'recomposition',
      });
    const assessmentId = assessRes.body.data.id;

    currentAuthUserId = 'athlete-b';
    const listB = await request(app).get('/api/physique');
    expect(listB.status).toBe(200);
    expect(listB.body.data).toEqual([]);

    const getB = await request(app).get(`/api/physique/${assessmentId}`);
    expect(getB.status).toBe(404);

    const planB = await request(app)
      .post(`/api/physique/${assessmentId}/generate-plan`)
      .send({});
    expect(planB.status).toBe(404);
  });
});
