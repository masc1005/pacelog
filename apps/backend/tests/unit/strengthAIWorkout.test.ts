import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildSevenDayActivityContext,
  selectExercisesBalanced,
  StrengthAIService,
  type CatalogExerciseItem,
} from '../../src/modules/strength/strength-ai.service.js';
import { ExerciseModel } from '../../src/modules/strength/exercise.model.js';
import { ActiveStrengthSessionModel } from '../../src/modules/strength/strength-session.model.js';
import { SessionModel } from '../../src/modules/sessions/session.model.js';
import { DailyReadinessModel } from '../../src/modules/readiness/readiness.model.js';
import { UserSettingsModel } from '../../src/modules/settings/settings.model.js';
import { progressService } from '../../src/modules/progress/progress.service.js';

const NOW = new Date('2026-11-19T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000);

const SAMPLE_CATALOG: CatalogExerciseItem[] = [
  { key: 'supino_reto_barra', name: 'Supino Reto (Barra)', primaryMuscleGroup: 'peito', secondaryMuscleGroups: ['ombros', 'triceps'], equipment: 'barra', type: 'compound' },
  { key: 'supino_inclinado_halteres', name: 'Supino Inclinado (Halteres)', primaryMuscleGroup: 'peito', secondaryMuscleGroups: ['ombros', 'triceps'], equipment: 'halteres', type: 'compound' },
  { key: 'crucifixo_maquina', name: 'Crucifixo (Máquina)', primaryMuscleGroup: 'peito', secondaryMuscleGroups: [], equipment: 'maquina', type: 'isolation' },
  { key: 'desenvolvimento_halteres', name: 'Desenvolvimento (Halteres)', primaryMuscleGroup: 'ombros', secondaryMuscleGroups: ['triceps'], equipment: 'halteres', type: 'compound' },
  { key: 'elevacao_lateral_halteres', name: 'Elevação Lateral (Halteres)', primaryMuscleGroup: 'ombros', secondaryMuscleGroups: [], equipment: 'halteres', type: 'isolation' },
  { key: 'triceps_corda_polia', name: 'Tríceps Corda (Polia)', primaryMuscleGroup: 'triceps', secondaryMuscleGroups: [], equipment: 'cabo', type: 'isolation' },
  { key: 'puxada_frente_polia', name: 'Puxada Frente (Polia)', primaryMuscleGroup: 'costas', secondaryMuscleGroups: ['biceps'], equipment: 'cabo', type: 'compound' },
  { key: 'remada_curvada_barra', name: 'Remada Curvada (Barra)', primaryMuscleGroup: 'costas', secondaryMuscleGroups: ['biceps'], equipment: 'barra', type: 'compound' },
  { key: 'remada_baixa_triangulo', name: 'Remada Baixa (Triângulo)', primaryMuscleGroup: 'costas', secondaryMuscleGroups: ['biceps'], equipment: 'cabo', type: 'compound' },
  { key: 'rosca_direta_barra', name: 'Rosca Direta (Barra)', primaryMuscleGroup: 'biceps', secondaryMuscleGroups: [], equipment: 'barra', type: 'isolation' },
  { key: 'rosca_martelo_halteres', name: 'Rosca Martelo (Halteres)', primaryMuscleGroup: 'biceps', secondaryMuscleGroups: [], equipment: 'halteres', type: 'isolation' },
  { key: 'agachamento_livre', name: 'Agachamento Livre (Barra)', primaryMuscleGroup: 'quadriceps', secondaryMuscleGroups: ['gluteos'], equipment: 'barra', type: 'compound' },
  { key: 'leg_press_45', name: 'Leg Press 45°', primaryMuscleGroup: 'quadriceps', secondaryMuscleGroups: ['gluteos'], equipment: 'maquina', type: 'compound' },
  { key: 'stiff_barra', name: 'Stiff (Barra)', primaryMuscleGroup: 'posteriores', secondaryMuscleGroups: ['gluteos'], equipment: 'barra', type: 'compound' },
  { key: 'elevacao_pelvica', name: 'Elevação Pélvica', primaryMuscleGroup: 'gluteos', secondaryMuscleGroups: ['posteriores'], equipment: 'barra', type: 'compound' },
  { key: 'panturrilha_em_pe', name: 'Panturrilha em Pé', primaryMuscleGroup: 'panturrilhas', secondaryMuscleGroups: [], equipment: 'maquina', type: 'isolation' },
];

const CATALOG_BY_KEY = new Map(SAMPLE_CATALOG.map((c) => [c.key, c]));

describe('StrengthAI 7-Day Multi-Sport Activity Analysis', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('buildSevenDayActivityContext', () => {
    it('considera atividades multiesportivas e musculação dos últimos 7 dias e ignora sessões com mais de 7 dias', () => {
      const ctx = buildSevenDayActivityContext({
        strengthSessions: [
          {
            _id: 'str-1',
            startedAt: hoursAgo(20),
            finishedAt: hoursAgo(19),
            durationSeconds: 3000,
            rpe: 8,
            exercises: [
              {
                exerciseKey: 'supino_reto_barra',
                primaryMuscleGroup: 'peito',
                sets: [{ status: 'completed' }, { status: 'completed' }, { status: 'completed' }, { status: 'completed' }],
              },
              {
                exerciseKey: 'triceps_corda_polia',
                primaryMuscleGroup: 'triceps',
                sets: [{ status: 'completed' }, { status: 'completed' }, { status: 'completed' }],
              },
            ],
          },
          {
            // Mais antiga que 7 dias -> deve ser ignorada na análise de 7 dias
            _id: 'str-old',
            startedAt: hoursAgo(200),
            finishedAt: hoursAgo(199),
            durationSeconds: 3600,
            rpe: 9,
            exercises: [
              {
                exerciseKey: 'puxada_frente_polia',
                primaryMuscleGroup: 'costas',
                sets: [{ status: 'completed' }, { status: 'completed' }, { status: 'completed' }],
              },
            ],
          },
        ],
        generalSessions: [
          {
            // Sessão sincronizada com ActiveStrengthSessionModel (mesmo _id) -> não deve duplicar
            _id: 'str-1',
            sportKey: 'strength',
            startedAt: hoursAgo(20),
            durationSeconds: 3000,
            rpe: 8,
            sessionalLoad: 400,
          },
          {
            _id: 'run-1',
            sportKey: 'running',
            startedAt: hoursAgo(44),
            durationSeconds: 2700,
            rpe: 7,
            sessionalLoad: 315,
            metrics: { distanceMeters: 8500, runningType: 'base' },
          },
          {
            // Mais antiga que 7 dias -> ignorada
            _id: 'run-old',
            sportKey: 'running',
            startedAt: hoursAgo(180),
            durationSeconds: 3600,
            rpe: 8,
            sessionalLoad: 480,
          },
        ],
        catalogByKey: CATALOG_BY_KEY,
        timezone: 'America/Bahia',
        now: NOW,
      });

      expect(ctx.totalSessions).toBe(2);
      expect(ctx.strengthSessionsCount).toBe(1);
      expect(ctx.otherSportsSessionsCount).toBe(1);
      expect(ctx.sportsPracticed).toEqual(['Musculação', 'Corrida']);
      expect(ctx.activityLines.some((l) => l.includes('Corrida (8.5 km, base)'))).toBe(true);
      expect(ctx.activityLines.some((l) => l.includes('Musculação'))).toBe(true);
      // Peito foi estimulado recentemente e Corrida impactou pernas -> Pull (Costas e Bíceps) vence
      expect(ctx.recommendedSplitName).toContain('Pull');
      expect(ctx.recommendedMuscles).toEqual(expect.arrayContaining(['costas', 'biceps']));
    });

    it('evita pernas quando atleta só fez corrida e futebol nos últimos dias, mesmo sem musculação recente', () => {
      const ctx = buildSevenDayActivityContext({
        strengthSessions: [],
        generalSessions: [
          {
            _id: 'foot-1',
            sportKey: 'football',
            startedAt: hoursAgo(16),
            durationSeconds: 4200,
            rpe: 8,
            sessionalLoad: 560,
            metrics: { matchType: 'society_7' },
          },
          {
            _id: 'run-2',
            sportKey: 'running',
            startedAt: hoursAgo(40),
            durationSeconds: 2400,
            rpe: 7,
            sessionalLoad: 280,
            metrics: { distanceMeters: 7000 },
          },
        ],
        catalogByKey: CATALOG_BY_KEY,
        now: NOW,
      });

      expect(ctx.totalSessions).toBe(2);
      expect(ctx.highImpactLowerCount).toBe(2);
      expect(ctx.muscleReadinessMap.quadriceps.sportImpactSessionsCount).toBe(2);
      expect(ctx.muscleReadinessMap.quadriceps.recoveryReadinessScore).toBeLessThan(
        ctx.muscleReadinessMap.peito.recoveryReadinessScore
      );
      expect(ctx.recommendedSplitName).not.toContain('Legs');
      expect(
        ctx.recommendedMuscles.some((m) => ['peito', 'costas', 'ombros', 'biceps', 'triceps'].includes(m))
      ).toBe(true);
    });

    it('prioriza inferiores quando atleta teve treino de boxe ontem e superiores antes', () => {
      const ctx = buildSevenDayActivityContext({
        strengthSessions: [
          {
            _id: 'str-push',
            startedAt: hoursAgo(72),
            finishedAt: hoursAgo(71),
            durationSeconds: 3000,
            rpe: 7,
            exercises: [
              {
                exerciseKey: 'supino_reto_barra',
                primaryMuscleGroup: 'peito',
                sets: [{ status: 'completed' }, { status: 'completed' }, { status: 'completed' }],
              },
            ],
          },
        ],
        generalSessions: [
          {
            _id: 'box-1',
            sportKey: 'boxing',
            startedAt: hoursAgo(18),
            durationSeconds: 3600,
            rpe: 8,
            sessionalLoad: 480,
            metrics: { roundsCount: 10 },
          },
        ],
        catalogByKey: CATALOG_BY_KEY,
        now: NOW,
      });

      expect(ctx.highImpactUpperCount).toBe(1);
      expect(ctx.muscleReadinessMap.ombros.impactingSports).toContain('Boxe');
      expect(ctx.muscleReadinessMap.costas.impactingSports).toContain('Boxe');
      expect(ctx.recommendedSplitName).toContain('Legs');
    });
  });

  describe('selectExercisesBalanced', () => {
    it('distribui exercícios entre os grupamentos alvo e posiciona compostos antes dos isoladores', () => {
      const picked = selectExercisesBalanced({
        candidateExercises: SAMPLE_CATALOG,
        targetMuscles: ['peito', 'ombros', 'triceps'],
        targetCount: 5,
      });

      expect(picked).toHaveLength(5);
      const muscles = new Set(picked.map((e) => e.primaryMuscleGroup));
      expect(muscles.has('peito')).toBe(true);
      expect(muscles.has('ombros')).toBe(true);
      expect(muscles.has('triceps')).toBe(true);

      // Todos os compostos devem aparecer antes de qualquer isolador
      const firstIsolationIdx = picked.findIndex((e) => e.type !== 'compound');
      const lastCompoundIdx = picked.map((e) => e.type).lastIndexOf('compound');
      if (firstIsolationIdx !== -1 && lastCompoundIdx !== -1) {
        expect(lastCompoundIdx).toBeLessThan(firstIsolationIdx);
      }
    });
  });

  describe('StrengthAIService.generateWorkout', () => {
    it('no fallback determinístico, escolhe grupamentos recuperados nos últimos 7 dias e preserva cargas fantasma > 7 dias', async () => {
      vi.spyOn(ExerciseModel, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue(SAMPLE_CATALOG),
      } as any);

      vi.spyOn(ActiveStrengthSessionModel, 'find').mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([
              {
                _id: 'str-recent',
                startedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
                finishedAt: new Date(Date.now() - 19 * 60 * 60 * 1000),
                durationSeconds: 2700,
                rpe: 8,
                exercises: [
                  {
                    exerciseKey: 'supino_reto_barra',
                    primaryMuscleGroup: 'peito',
                    sets: [{ status: 'completed', reps: 10, load: 80, loadUnit: 'kg' }],
                  },
                ],
              },
              {
                // Treino de costas há 10 dias (fora da janela de 7d para fadiga, mas válido para carga fantasma!)
                _id: 'str-10d',
                startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                finishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 3600000),
                durationSeconds: 3600,
                rpe: 7,
                exercises: [
                  {
                    exerciseKey: 'puxada_frente_polia',
                    primaryMuscleGroup: 'costas',
                    sets: [{ status: 'completed', reps: 10, load: 65, loadUnit: 'kg' }],
                  },
                ],
              },
            ]),
          }),
        }),
      } as any);

      vi.spyOn(SessionModel, 'find').mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: 'run-yesterday',
              sportKey: 'running',
              startedAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
              durationSeconds: 3000,
              rpe: 7,
              sessionalLoad: 350,
              metrics: { distanceMeters: 10000 },
            },
          ]),
        }),
      } as any);

      vi.spyOn(DailyReadinessModel, 'findOne').mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      } as any);

      vi.spyOn(UserSettingsModel, 'findOne').mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ timezone: 'America/Bahia' }),
        }),
      } as any);

      vi.spyOn(progressService, 'getMuscleFatigueMap').mockResolvedValue({
        generatedAt: new Date().toISOString(),
        regions: [],
      });

      const service = new StrengthAIService();
      (service as any).ai = null; // força fallback determinístico

      const result = await service.generateWorkout('user-1', {
        durationMinutes: 45,
        goal: 'hypertrophy',
      });

      expect(result.modelUsed).toBe('deterministic-fallback');
      expect(result.name).toContain('Pull');
      expect(result.rationale).toContain('7 dias');
      expect(result.rationale).toContain('Corrida');

      const puxada = result.exercises.find((e) => e.exerciseKey === 'puxada_frente_polia');
      expect(puxada).toBeDefined();
      expect(puxada?.sets[0].load).toBe(65);
    });

    it('envia resumo e atividades multiesportivas dos últimos 7 dias no prompt do Gemini', async () => {
      vi.spyOn(ExerciseModel, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue(SAMPLE_CATALOG),
      } as any);

      vi.spyOn(ActiveStrengthSessionModel, 'find').mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      vi.spyOn(SessionModel, 'find').mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: 'foot-recent',
              sportKey: 'football',
              startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
              durationSeconds: 3600,
              rpe: 8,
              sessionalLoad: 480,
              metrics: { matchType: 'futsal' },
            },
            {
              _id: 'swim-recent',
              sportKey: 'swimming',
              startedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
              durationSeconds: 2400,
              rpe: 6,
              sessionalLoad: 240,
              metrics: { totalDistanceMeters: 1500 },
            },
          ]),
        }),
      } as any);

      vi.spyOn(DailyReadinessModel, 'findOne').mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      } as any);

      vi.spyOn(UserSettingsModel, 'findOne').mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ timezone: 'America/Bahia' }),
        }),
      } as any);

      vi.spyOn(progressService, 'getMuscleFatigueMap').mockResolvedValue({
        generatedAt: new Date().toISOString(),
        regions: [],
      });

      const generateContentMock = vi.fn().mockResolvedValue({
        text: JSON.stringify({
          name: 'Push Recuperação',
          description: 'Foco em superiores preservando inferiores após futebol',
          rationale: 'Considerando o futebol há 1 dia e a natação há 3 dias, focamos em peito e tríceps.',
          exercises: [
            { exerciseKey: 'supino_reto_barra', setsCount: 4, targetReps: 10, restSeconds: 90 },
            { exerciseKey: 'triceps_corda_polia', setsCount: 3, targetReps: 12, restSeconds: 60 },
          ],
        }),
        modelVersion: 'mock-gemini',
      });

      const service = new StrengthAIService();
      (service as any).ai = {
        models: {
          generateContent: generateContentMock,
        },
      };

      const result = await service.generateWorkout('user-1', {
        durationMinutes: 45,
        goal: 'hypertrophy',
      });

      expect(generateContentMock).toHaveBeenCalledTimes(1);
      const calledPrompt: string = generateContentMock.mock.calls[0][0].contents;
      expect(calledPrompt).toContain('ÚLTIMOS 7 DIAS');
      expect(calledPrompt).toContain('Futebol (futsal)');
      expect(calledPrompt).toContain('Natação (1500 m)');
      expect(result.name).toBe('Push Recuperação');
      expect(result.exercises.map((e) => e.exerciseKey)).toEqual([
        'supino_reto_barra',
        'triceps_corda_polia',
      ]);
    });
  });
});
