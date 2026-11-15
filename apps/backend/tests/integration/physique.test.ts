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

function mockGeminiSuccess(overrides: Record<string, any> = {}) {
  (physiqueService as any).ai = {};
  return vi
    .spyOn(physiqueService as any, 'callGeminiMultimodalWithTimeout')
    .mockImplementation(async (_modelName: unknown, _sys: unknown, contents: any) => {
      const slots: string[] = [];
      if (Array.isArray(contents)) {
        for (const part of contents) {
          if (typeof part?.text === 'string' && part.text.startsWith('CAPTURA ENVIADA: ')) {
            const slot = part.text.replace('CAPTURA ENVIADA: ', '').split(' ')[0];
            slots.push(slot);
          }
        }
      }
      const primarySlot = slots[0] || 'front_double_biceps';

      return {
        modelVersion: 'gemini-test-mock',
        text: JSON.stringify({
          imageQualityCheck: {
            isAssessable: true,
          },
          spatialCalibration: {
            detectedReferenceObjects: ['batente de porta ~210cm'],
            perspectiveDistortionNote: 'Calibrado pela altura real e linha vertical da porta.',
            calibrationConfidence: 'high',
          },
          anthropometryEstimate: {
            bmi: 25,
            estimatedBodyFatRange: { min: 11, max: 14 },
            vTaperVisualScore: 81,
            overallSymmetryScore: 84,
          },
          poseBreakdown: slots.map((poseType) => ({
            poseType,
            muscularAnalysis: `Análise muscular específica de ${poseType}.`,
            posingExecutionTip: `Ajuste técnico específico para ${poseType}.`,
          })),
          physiqueSummary: 'Boa densidade geral com oportunidade de ganho em deltoides e peitoral superior.',
          strongPoints: [
            {
              muscleGroup: 'costas',
              note: 'Boa amplitude lateral de dorsais observada nas vistas analisadas.',
            },
          ],
          weakPoints: [
            {
              muscleGroup: 'peito',
              subRegion: 'Peitoral superior (feixe clavicular)',
              priority: 'high',
              detectedInPoses: [primarySlot],
              technicalReason: 'Menor preenchimento clavicular em comparação ao feixe esternal.',
              targetWeeklySets: 14,
              recommendedExerciseNames: ['Supino Inclinado (Halteres)'],
            },
            {
              muscleGroup: 'quadriceps',
              subRegion: 'Vasto medial do quadríceps',
              priority: 'medium',
              detectedInPoses: [primarySlot],
              technicalReason: 'Equilíbrio de volume próximo ao joelho.',
              targetWeeklySets: 12,
              recommendedExerciseNames: ['Agachamento Livre (Barra)'],
            },
          ],
          posturalObservations: ['Manter escápulas estabilizadas e pelve neutra.'],
          recommendedSplit: 'Upper / Lower (4x) priorizando peitoral superior.',
          ...overrides,
        }),
      };
    });
}

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
    (physiqueService as any).ai = null;
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
        poses: [
          {
            poseType: 'front_double_biceps',
            base64: 'YWJjZGVmZ2hpamtsbW5vcA==',
            mimeType: 'image/jpeg',
          },
        ],
        heightCm: 178,
        weightKg: 80,
        biologicalSex: 'male',
        age: 28,
        goal: 'hypertrophy',
      });

    expect(res.status).toBe(401);
  });

  it('POST /api/physique/assess deve retornar 503 (sem salvar avaliação fake) quando a IA estiver indisponível ou falhar', async () => {
    currentAuthUserId = 'athlete-unavailable';
    (physiqueService as any).ai = null;

    const noKeyRes = await request(app)
      .post('/api/physique/assess')
      .send({
        poses: [
          {
            poseType: 'front',
            base64: 'YWJjZGVmZ2hpamtsbW5vcA==',
            mimeType: 'image/jpeg',
          },
        ],
        heightCm: 178,
        weightKg: 80,
        biologicalSex: 'male',
        age: 28,
        goal: 'hypertrophy',
      });

    expect(noKeyRes.status).toBe(503);
    expect(noKeyRes.body.error).toBe('PHYSIQUE_AI_UNAVAILABLE');
    expect(noKeyRes.body.details.message).toMatch(/tente novamente/i);
    expect(await PhysiqueAssessmentModel.countDocuments({ userId: 'athlete-unavailable' })).toBe(0);

    // Simula falha/timeout em todos os modelos Gemini
    (physiqueService as any).ai = {};
    const failSpy = vi
      .spyOn(physiqueService as any, 'callGeminiMultimodalWithTimeout')
      .mockRejectedValue(new Error('Gemini timeout'));

    const failedRes = await request(app)
      .post('/api/physique/assess')
      .send({
        poses: [
          {
            poseType: 'front_double_biceps',
            base64: 'YWJjZGVmZ2hpamtsbW5vcA==',
            mimeType: 'image/jpeg',
          },
        ],
        heightCm: 178,
        weightKg: 80,
        biologicalSex: 'male',
        age: 28,
        goal: 'hypertrophy',
      });

    expect(failedRes.status).toBe(503);
    expect(failedRes.body.error).toBe('PHYSIQUE_AI_UNAVAILABLE');
    expect(failedRes.body.details.message).toMatch(/tente novamente/i);
    expect(await PhysiqueAssessmentModel.countDocuments({ userId: 'athlete-unavailable' })).toBe(0);

    failSpy.mockRestore();

    // Nova tentativa após retorno da IA ainda deve funcionar (503 não consumiu cota)
    mockGeminiSuccess();
    const okRes = await request(app)
      .post('/api/physique/assess')
      .send({
        poses: [
          {
            poseType: 'front',
            base64: 'YWJjZGVmZ2hpamtsbW5vcA==',
            mimeType: 'image/jpeg',
          },
        ],
        heightCm: 178,
        weightKg: 80,
        biologicalSex: 'male',
        age: 28,
        goal: 'hypertrophy',
      });
    expect(okRes.status).toBe(201);
  });

  it('POST /api/physique/assess deve validar heightCm e rejeitar poseType duplicado', async () => {
    currentAuthUserId = 'athlete-1';

    const invalidHeight = await request(app)
      .post('/api/physique/assess')
      .send({
        poses: [
          {
            poseType: 'front_double_biceps',
            base64: 'YWJjZGVmZ2hpamtsbW5vcA==',
            mimeType: 'image/jpeg',
          },
        ],
        heightCm: 80, // < 100 inválido
        weightKg: 80,
        biologicalSex: 'male',
        age: 28,
        goal: 'hypertrophy',
      });

    expect(invalidHeight.status).toBe(400);
    expect(invalidHeight.body.error).toBe('VALIDATION_ERROR');

    const duplicatePose = await request(app)
      .post('/api/physique/assess')
      .send({
        poses: [
          {
            poseType: 'side_chest',
            base64: 'YWJjZGVmZ2hpamtsbW5vcA==',
            mimeType: 'image/jpeg',
          },
          {
            poseType: 'side_chest',
            base64: 'YWJjZGVmZ2hpamtsbW5vcA==',
            mimeType: 'image/jpeg',
          },
        ],
        heightCm: 178,
        weightKg: 80,
        biologicalSex: 'male',
        age: 28,
        goal: 'classic_physique',
      });

    expect(duplicatePose.status).toBe(400);
    expect(duplicatePose.body.error).toBe('VALIDATION_ERROR');

    const duplicateStandardAngle = await request(app)
      .post('/api/physique/assess')
      .send({
        poses: [
          {
            poseType: 'front',
            base64: 'YWJjZGVmZ2hpamtsbW5vcA==',
            mimeType: 'image/jpeg',
          },
          {
            poseType: 'front',
            base64: 'YWJjZGVmZ2hpamtsbW5vcA==',
            mimeType: 'image/jpeg',
          },
        ],
        heightCm: 178,
        weightKg: 80,
        biologicalSex: 'male',
        age: 28,
        goal: 'hypertrophy',
      });

    expect(duplicateStandardAngle.status).toBe(400);
    expect(duplicateStandardAngle.body.error).toBe('VALIDATION_ERROR');
  });

  it('POST /api/physique/assess deve suportar as 3 fotos normais (front, back, side) e combinação híbrida com poses sem persistir imagens', async () => {
    currentAuthUserId = 'athlete-standard';
    mockGeminiSuccess();

    const sampleBase64 = 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo=';
    const standardRes = await request(app)
      .post('/api/physique/assess')
      .send({
        poses: [
          { poseType: 'front', base64: sampleBase64, mimeType: 'image/jpeg' },
          { poseType: 'back', base64: sampleBase64, mimeType: 'image/webp' },
          { poseType: 'side', base64: sampleBase64, mimeType: 'image/jpeg' },
        ],
        heightCm: 176,
        weightKg: 74,
        biologicalSex: 'female',
        age: 26,
        goal: 'recomposition',
      });

    expect(standardRes.status).toBe(201);
    expect(standardRes.body.data.result.poseBreakdown).toHaveLength(3);
    expect(
      standardRes.body.data.result.poseBreakdown.map((item: any) => item.poseType)
    ).toEqual(['front', 'back', 'side']);
    expect(
      standardRes.body.data.result.weakPoints.some((wp: any) =>
        wp.detectedInPoses.some((slot: string) => ['front', 'back', 'side'].includes(slot))
      )
    ).toBe(true);

    const rawStandardDoc = await PhysiqueAssessmentModel.findById(standardRes.body.data.id).lean();
    expect(JSON.stringify(rawStandardDoc)).not.toContain(sampleBase64);

    // Combinação híbrida: fotos normais + poses de fisiculturismo na mesma chamada
    const hybridRes = await request(app)
      .post('/api/physique/assess')
      .send({
        poses: [
          { poseType: 'front', base64: sampleBase64, mimeType: 'image/jpeg' },
          { poseType: 'side', base64: sampleBase64, mimeType: 'image/jpeg' },
          { poseType: 'front_double_biceps', base64: sampleBase64, mimeType: 'image/jpeg' },
          { poseType: 'back_double_biceps', base64: sampleBase64, mimeType: 'image/jpeg' },
        ],
        heightCm: 176,
        weightKg: 73.2,
        biologicalSex: 'female',
        age: 26,
        goal: 'definition',
      });

    expect(hybridRes.status).toBe(201);
    expect(hybridRes.body.data.result.poseBreakdown).toHaveLength(4);
    expect(
      hybridRes.body.data.result.poseBreakdown.map((item: any) => item.poseType)
    ).toEqual(['front', 'side', 'front_double_biceps', 'back_double_biceps']);
    expect(hybridRes.body.data.result.comparisonWithPrevious).toBeDefined();
  });

  it('POST /api/physique/assess deve analisar até 5 poses de forma efêmera, persistir perfil e gerar poseBreakdown + subRegion', async () => {
    currentAuthUserId = 'athlete-1';
    mockGeminiSuccess();

    const sampleBase64 = 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo=';
    const res = await request(app)
      .post('/api/physique/assess')
      .send({
        poses: [
          { poseType: 'front_double_biceps', base64: sampleBase64, mimeType: 'image/jpeg' },
          { poseType: 'side_chest', base64: sampleBase64, mimeType: 'image/webp' },
          { poseType: 'back_double_biceps', base64: sampleBase64, mimeType: 'image/jpeg' },
          { poseType: 'side_triceps', base64: sampleBase64, mimeType: 'image/jpeg' },
          { poseType: 'abs_and_thighs', base64: sampleBase64, mimeType: 'image/jpeg' },
        ],
        heightCm: 180,
        weightKg: 81,
        biologicalSex: 'male',
        age: 30,
        birthDate: '1994-05-10',
        goal: 'classic_physique',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.heightCm).toBe(180);
    expect(res.body.data.weightKg).toBe(81);
    expect(res.body.data.biologicalSex).toBe('male');
    expect(res.body.data.age).toBe(30);
    expect(res.body.data.result.imageQualityCheck.isAssessable).toBe(true);
    expect(res.body.data.result.anthropometryEstimate.bmi).toBe(25);
    expect(res.body.data.result.anthropometryEstimate.vTaperVisualScore).toBeGreaterThan(0);
    expect(res.body.data.result.anthropometryEstimate.overallSymmetryScore).toBeGreaterThan(0);
    expect(res.body.data.result.poseBreakdown).toHaveLength(5);
    expect(res.body.data.result.poseBreakdown[0].posingExecutionTip).toBeTruthy();
    expect(res.body.data.result.weakPoints.length).toBeGreaterThan(0);
    expect(res.body.data.result.weakPoints[0].subRegion).toBeTruthy();
    expect(res.body.data.result.weakPoints[0].detectedInPoses.length).toBeGreaterThan(0);

    // Garante que nenhuma imagem / base64 foi persistida no MongoDB
    const rawDoc = await PhysiqueAssessmentModel.findById(res.body.data.id).lean();
    expect(rawDoc).toBeDefined();
    expect((rawDoc as any).poses).toBeUndefined();
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
    mockGeminiSuccess();

    const first = await request(app)
      .post('/api/physique/assess')
      .send({
        poses: [
          {
            poseType: 'front_double_biceps',
            base64: 'YWJjZGVmZ2hpamtsbW5vcA==',
            mimeType: 'image/jpeg',
          },
        ],
        heightCm: 175,
        weightKg: 80,
        biologicalSex: 'male',
        age: 30,
        goal: 'definition',
      });
    expect(first.status).toBe(201);
    expect(first.body.data.result.comparisonWithPrevious).toBeUndefined();

    const second = await request(app)
      .post('/api/physique/assess')
      .send({
        poses: [
          {
            poseType: 'front_double_biceps',
            base64: 'YWJjZGVmZ2hpamtsbW5vcA==',
            mimeType: 'image/jpeg',
          },
        ],
        heightCm: 175,
        weightKg: 78.5,
        biologicalSex: 'male',
        age: 30,
        goal: 'definition',
      });
    expect(second.status).toBe(201);
    expect(second.body.data.result.comparisonWithPrevious).toBeDefined();
    expect(second.body.data.result.comparisonWithPrevious.weightDeltaKg).toBe(-1.5);
    expect(second.body.data.result.comparisonWithPrevious.conditioningEvolutionNote).toBeTruthy();
    expect(second.body.data.result.comparisonWithPrevious.daysSinceLast).toBeGreaterThanOrEqual(0);

    // 3a tentativa na janela de 7 dias deve retornar 429
    const third = await request(app)
      .post('/api/physique/assess')
      .send({
        poses: [
          {
            poseType: 'front_double_biceps',
            base64: 'YWJjZGVmZ2hpamtsbW5vcA==',
            mimeType: 'image/jpeg',
          },
        ],
        heightCm: 175,
        weightKg: 78,
        biologicalSex: 'male',
        age: 30,
        goal: 'definition',
      });
    expect(third.status).toBe(429);
    expect(third.body.error).toBe('PHYSIQUE_RATE_LIMIT_EXCEEDED');
  });

  it('POST /api/physique/assess deve retornar 422 com wrong_pose sem salvar no banco nem gastar cota', async () => {
    currentAuthUserId = 'athlete-quality';

    (physiqueService as any).ai = {};
    const spy = vi
      .spyOn(physiqueService as any, 'callGeminiMultimodalWithTimeout')
      .mockResolvedValue({
        text: JSON.stringify({
          imageQualityCheck: {
            isAssessable: false,
            rejectionReason: 'wrong_pose',
            userFeedback:
              'A foto enviada não corresponde à pose Duplo Bíceps de Frente. Posicione os braços erguidos e enquadre o corpo.',
          },
          spatialCalibration: {
            detectedReferenceObjects: [],
            perspectiveDistortionNote: 'Não avaliável',
            calibrationConfidence: 'low',
          },
          anthropometryEstimate: {
            bmi: 24.5,
            estimatedBodyFatRange: { min: 15, max: 20 },
            vTaperVisualScore: 50,
            overallSymmetryScore: 50,
          },
          poseBreakdown: [],
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
        poses: [
          {
            poseType: 'front_double_biceps',
            base64: 'YWJjZGVmZ2hpamtsbW5vcA==',
            mimeType: 'image/jpeg',
          },
        ],
        heightCm: 175,
        weightKg: 75,
        biologicalSex: 'male',
        age: 26,
        goal: 'hypertrophy',
      });

    expect(rejected.status).toBe(422);
    expect(rejected.body.error).toBe('PHYSIQUE_IMAGE_NOT_ASSESSABLE');
    expect(rejected.body.details.rejectionReason).toBe('wrong_pose');
    expect(rejected.body.details.message).toContain('Duplo Bíceps');

    expect(await PhysiqueAssessmentModel.countDocuments({ userId: 'athlete-quality' })).toBe(0);

    spy.mockRestore();

    // Nova tentativa válida ainda deve ser aceita (422 não consumiu cota)
    mockGeminiSuccess();
    const ok = await request(app)
      .post('/api/physique/assess')
      .send({
        poses: [
          {
            poseType: 'front_double_biceps',
            base64: 'YWJjZGVmZ2hpamtsbW5vcA==',
            mimeType: 'image/jpeg',
          },
        ],
        heightCm: 175,
        weightKg: 75,
        biologicalSex: 'male',
        age: 26,
        goal: 'hypertrophy',
      });
    expect(ok.status).toBe(201);
  });

  it('POST /api/physique/:id/generate-plan deve cruzar subRegion com catálogo, respeitar adapt_existing e carga multiesportiva', async () => {
    currentAuthUserId = 'athlete-plan';
    mockGeminiSuccess();

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
        poses: [
          {
            poseType: 'side_chest',
            base64: 'YWJjZGVmZ2hpamtsbW5vcA==',
            mimeType: 'image/jpeg',
          },
        ],
        heightCm: 175,
        weightKg: 76,
        biologicalSex: 'male',
        age: 29,
        goal: 'mens_physique',
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

    // Verifica que subRegion de Peitoral superior selecionou exercício inclinado/polia baixa
    const chestExercise = adaptedRoutine.exercises.find(
      (ex: any) => ex.primaryMuscleGroup === 'peito'
    );
    if (chestExercise) {
      expect(chestExercise.exerciseKey).toMatch(/inclinado|polia_baixa/i);
    }

    // Verifica que séries de inferiores foram moderadas (<= 3 séries por exercício) devido à corrida + futevôlei
    for (const ex of adaptedRoutine.exercises) {
      if (['quadriceps', 'posteriores', 'gluteos', 'panturrilhas'].includes(ex.primaryMuscleGroup)) {
        expect(ex.sets.length).toBeLessThanOrEqual(3);
      }
    }
  });

  it('Isolamento de usuário: atleta B não pode acessar avaliação ou gerar plano do atleta A', async () => {
    currentAuthUserId = 'athlete-a';
    mockGeminiSuccess();

    const assessRes = await request(app)
      .post('/api/physique/assess')
      .send({
        poses: [
          {
            poseType: 'abs_and_thighs',
            base64: 'YWJjZGVmZ2hpamtsbW5vcA==',
            mimeType: 'image/jpeg',
          },
        ],
        heightCm: 175,
        weightKg: 75,
        biologicalSex: 'female',
        age: 27,
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
