import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { env } from '../../config/env.js';
import {
  getValidGeminiModel,
  PRIMARY_GEMINI_MODEL,
  FALLBACK_GEMINI_MODEL,
} from '../insights/insight.service.js';
import { ExerciseModel } from './exercise.model.js';
import { SYSTEM_EXERCISES } from './exercise.seed.js';
import { ActiveStrengthSessionModel } from './strength-session.model.js';
import { DailyReadinessModel } from '../readiness/readiness.model.js';
import { UserSportModel } from '../settings/userSport.model.js';
import { WeeklyScheduleModel } from '../schedule/schedule.model.js';
import { StrengthRoutineModel, type IStrengthRoutineDocument } from './strength-routine.model.js';
import type {
  GenerateStrengthWorkoutInput,
  GeneratedStrengthWorkoutDTO,
  StrengthRoutineExerciseTemplate,
  PhysiqueAssessmentResult,
  PhysiqueAssessmentGoal,
  GeneratePhysiquePlanInput,
} from '@pacelog/shared';

const HIGH_IMPACT_LOWER_SPORTS = new Set([
  'running',
  'cycling',
  'futevolei',
  'football',
  'boxing',
  'jiujitsu',
]);

const LOWER_BODY_MUSCLE_GROUPS = new Set([
  'quadriceps',
  'posteriores',
  'gluteos',
  'panturrilhas',
]);

const aiGeneratedWorkoutSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(300),
  rationale: z.string().max(600),
  exercises: z
    .array(
      z.object({
        exerciseKey: z.string().min(1),
        setsCount: z.number().int().min(1).max(8).default(3),
        targetReps: z.number().int().min(1).max(50).default(10),
        restSeconds: z.number().int().min(15).max(300).default(90),
        notes: z.string().max(200).optional(),
      })
    )
    .min(1)
    .max(12),
});

const aiCorrectionRoutinesSchema = z.object({
  summary: z.string().max(500),
  routines: z
    .array(
      z.object({
        name: z.string().min(2).max(80),
        description: z.string().max(300),
        exercises: z
          .array(
            z.object({
              exerciseKey: z.string().min(1),
              setsCount: z.number().int().min(1).max(8).default(3),
              targetReps: z.number().int().min(1).max(50).default(10),
              restSeconds: z.number().int().min(15).max(300).default(90),
              notes: z.string().max(200).optional(),
            })
          )
          .min(1)
          .max(12),
      })
    )
    .min(1)
    .max(4),
});

export class StrengthAIService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }
  }

  private async callGeminiWithTimeout(
    modelName: string,
    promptText: string,
    timeoutMs: number
  ): Promise<any> {
    if (!this.ai) throw new Error('Gemini AI not initialized');

    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Timeout after ${timeoutMs}ms calling model ${modelName}`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([
        this.ai.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            temperature: 0.4,
            responseMimeType: 'application/json',
          },
        }),
        timeoutPromise,
      ]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  async generateWorkout(
    userId: string,
    input: GenerateStrengthWorkoutInput
  ): Promise<GeneratedStrengthWorkoutDTO> {
    // 1. Buscar catálogo, histórico recente e prontidão diária em paralelo
    const [dbExercises, recentSessions, latestReadiness] = await Promise.all([
      ExerciseModel.find({
        isActive: true,
        $or: [{ isSystem: true }, { ownerId: userId }],
      }).lean(),
      ActiveStrengthSessionModel.find({
        userId,
        status: 'completed',
      })
        .sort({ startedAt: -1 })
        .limit(12)
        .lean(),
      DailyReadinessModel.findOne({ userId })
        .sort({ dateKey: -1 })
        .lean()
        .catch(() => null),
    ]);

    const catalog =
      dbExercises.length > 0
        ? dbExercises.map((e) => ({
            key: e.key,
            name: e.name,
            primaryMuscleGroup: e.primaryMuscleGroup,
            secondaryMuscleGroups: e.secondaryMuscleGroups,
            equipment: e.equipment,
            type: e.type,
          }))
        : SYSTEM_EXERCISES.map((e) => ({
            key: e.key,
            name: e.name,
            primaryMuscleGroup: e.primaryMuscleGroup,
            secondaryMuscleGroups: [],
            equipment: e.equipment,
            type: e.type,
          }));

    const catalogByKey = new Map(catalog.map((c) => [c.key, c]));

    // 2. Extrair cargas de referência (ghost values) e resumo dos últimos treinos
    const latestCompletedSetsByExercise = new Map<string, any[]>();
    const recentWorkoutsSummary: string[] = [];

    for (const past of recentSessions) {
      const dateStr = new Date(past.startedAt).toISOString().split('T')[0];
      const musclesInSession = new Set<string>();

      for (const ex of past.exercises || []) {
        if (ex.primaryMuscleGroup) musclesInSession.add(ex.primaryMuscleGroup);
        if (!latestCompletedSetsByExercise.has(ex.exerciseKey)) {
          const completedSets = (ex.sets || []).filter((s) => s.status === 'completed');
          if (completedSets.length > 0) {
            latestCompletedSetsByExercise.set(ex.exerciseKey, completedSets);
          }
        }
      }

      if (recentWorkoutsSummary.length < 5) {
        recentWorkoutsSummary.push(
          `${dateStr}: ${Array.from(musclesInSession).join(', ') || 'geral'} (${(past.exercises || []).length} exercícios)`
        );
      }
    }

    // 3. Filtrar catálogo candidato para enviar um prompt enxuto e rápido
    const requestedMuscles = (input.muscleGroups || []).filter(Boolean);
    const requestedEquipment = (input.equipment || []).filter(Boolean);
    const soreRegions = (input.soreRegions ?? latestReadiness?.soreRegions ?? []).map((region) =>
      region.toLowerCase()
    );
    const soreAliases: Record<string, string[]> = {
      core: ['abdomen', 'lombar'],
      pegada: ['antebracos', 'costas', 'biceps'],
      joelhos: ['quadriceps', 'posteriores', 'gluteos'],
      lombar: ['costas', 'posteriores', 'gluteos'],
    };
    const exerciseOverloadsSoreRegion = (exercise: {
      primaryMuscleGroup: string;
      secondaryMuscleGroups?: string[];
    }) => {
      const exerciseGroups = [
        exercise.primaryMuscleGroup,
        ...(exercise.secondaryMuscleGroups ?? []),
      ];
      return soreRegions.some((region) =>
        [region, ...(soreAliases[region] ?? [])].some((blocked) =>
          exerciseGroups.includes(blocked)
        )
      );
    };

    let candidateExercises = catalog;
    if (requestedMuscles.length > 0) {
      const filtered = catalog.filter((c) =>
        requestedMuscles.includes(c.primaryMuscleGroup)
      );
      if (filtered.length >= 4) {
        candidateExercises = filtered;
      }
    }
    if (requestedEquipment.length > 0) {
      const filtered = candidateExercises.filter((c) =>
        requestedEquipment.includes(c.equipment)
      );
      if (filtered.length >= 3) {
        candidateExercises = filtered;
      }
    }
    if (soreRegions.length > 0) {
      // Dor localizada é uma restrição rígida: nunca envie ao modelo um
      // exercício que sobrecarregue uma região protegida.
      candidateExercises = candidateExercises.filter(
        (exercise) => !exerciseOverloadsSoreRegion(exercise)
      );
    }

    const durationMinutes = input.durationMinutes ?? 45;
    const goal = input.goal ?? 'hypertrophy';

    const readinessScore = input.readinessScore ?? latestReadiness?.readinessScore;
    const muscleRecovery = input.muscleRecovery ?? latestReadiness?.muscleRecovery;
    const readinessMultiplier =
      muscleRecovery !== undefined && muscleRecovery <= 2
        ? 0.75
        : readinessScore !== undefined && readinessScore < 60
          ? 0.75
          : readinessScore !== undefined && readinessScore < 80
            ? 0.9
            : 1;
    const readinessContext =
      latestReadiness || readinessScore !== undefined
        ? `Score ${readinessScore ?? latestReadiness?.readinessScore}/100 — Recuperação Muscular: ${muscleRecovery ?? latestReadiness?.muscleRecovery}/5. Multiplicador de volume: ${readinessMultiplier}. Regiões protegidas: ${soreRegions.join(', ') || 'nenhuma'}.`
        : 'Check-in de prontidão não registrado hoje.';

    // 4. Tentar gerar com padrão gemini-3.8-flash e fallback gemini-3.5-flash-lite
    if (this.ai) {
      const primaryModel = getValidGeminiModel(env.GEMINI_MODEL || PRIMARY_GEMINI_MODEL);
      const modelsToTry = Array.from(
        new Set([primaryModel, PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL])
      );

      const catalogListText = candidateExercises
        .map(
          (c) =>
            `${c.key} | ${c.name} | músculo:${c.primaryMuscleGroup} | equip:${c.equipment} | tipo:${c.type}`
        )
        .join('\n');

      const promptText = `Você é o IA Personal Trainer do Pacelog (telemetria esportiva).
Sua missão é montar uma ficha/sessão de musculação altamente estruturada, eficiente e personalizada para o atleta.

REGRAS OBRIGATÓRIAS:
- Nunca faça diagnósticos médicos, não mencione "risco de lesão" ou termos clínicos.
- Escolha EXCLUSIVAMENTE exercícios presentes no CATÁLOGO DISPONÍVEL abaixo, usando exatamente a chave \`exerciseKey\`.
- Priorize exercícios compostos (multiarticulares) no início do treino e isoladores depois.
- Ajuste o volume total (quantidade de exercícios e séries) para caber no tempo disponível (${durationMinutes} minutos) e respeitando a prontidão diária do atleta:
  - ~30 min: 3 a 4 exercícios
  - ~45 min: 4 a 6 exercícios
  - ~60 min: 5 a 7 exercícios
  - ~75+ min: 6 a 8 exercícios
- Se o atleta não especificou grupamentos musculares nem pedido livre, analise os últimos treinos dele e sugira uma sessão complementar lógica (ex.: se treinou Peito/Tríceps por último, sugira Costas/Bíceps ou Pernas).
- Nunca selecione exercícios cujo grupo primário ou secundário sobrecarregue as regiões protegidas por dor: ${soreRegions.join(', ') || 'nenhuma'}.

PARÂMETROS DO ATLETA:
- Pedido livre / foco específico: ${input.prompt?.trim() ? `"${input.prompt.trim()}"` : 'Nenhum pedido específico'}
- Grupamentos selecionados: ${requestedMuscles.length > 0 ? requestedMuscles.join(', ') : 'Sugerir com base no histórico / pedido'}
- Equipamentos preferidos: ${requestedEquipment.length > 0 ? requestedEquipment.join(', ') : 'Qualquer equipamento da academia'}
- Duração alvo: ${durationMinutes} minutos
- Objetivo principal: ${goal}
- Prontidão Diária (Check-in): ${readinessContext}
- Últimos treinos realizados pelo atleta:
${recentWorkoutsSummary.length > 0 ? recentWorkoutsSummary.join('\n') : 'Sem histórico recente registrado.'}

CATÁLOGO DISPONÍVEL (use apenas estas chaves em \`exerciseKey\`):
${catalogListText}

Retorne APENAS um JSON válido com a estrutura:
{
  "name": "Nome curto e forte para a ficha (ex: Push A - Peito, Ombros e Tríceps)",
  "description": "Resumo de 1 linha do foco do treino",
  "rationale": "Explicação direta do IA Personal (2 a 3 frases) sobre por que essa combinação e ordem de exercícios foi escolhida para o tempo/objetivo e prontidão do atleta.",
  "exercises": [
    {
      "exerciseKey": "chave_exata_do_catalogo",
      "setsCount": 4,
      "targetReps": 10,
      "restSeconds": 90,
      "notes": "Dica técnica curta de execução ou cadência (opcional)"
    }
  ]
}`;

      for (const modelName of modelsToTry) {
        const startedMs = Date.now();
        try {
          console.log(`[StrengthAIService] Calling model ${modelName} (timeout 20s)...`);
          const response = await this.callGeminiWithTimeout(modelName, promptText, 20000);

          const rawText = response.text?.trim();
          if (!rawText) continue;

          const parsedJson = JSON.parse(rawText);
          const validated = aiGeneratedWorkoutSchema.parse(parsedJson);

          const mappedExercises = this.hydrateExercisesWithCatalogAndGhostLoads(
            validated.exercises.map((exercise) => ({
              ...exercise,
              setsCount: Math.max(1, Math.round(exercise.setsCount * readinessMultiplier)),
            })),
            catalogByKey,
            latestCompletedSetsByExercise
          );

          const protectedMappedExercises = mappedExercises.filter((exercise) => {
            const catalogExercise = catalogByKey.get(exercise.exerciseKey);
            return catalogExercise
              ? !exerciseOverloadsSoreRegion(catalogExercise)
              : false;
          });

          if (protectedMappedExercises.length > 0) {
            const elapsedMs = Date.now() - startedMs;
            const resolvedModel = response?.modelVersion
              ? `${modelName} (${response.modelVersion})`
              : modelName;
            console.log(
              `[StrengthAIService] Generated workout with ${resolvedModel} in ${elapsedMs}ms`
            );
            return {
              name: validated.name,
              description: validated.description,
              rationale: validated.rationale,
              exercises: protectedMappedExercises.map((exercise, index) => ({
                ...exercise,
                order: index,
              })),
              modelUsed: resolvedModel,
            };
          }
        } catch (err: any) {
          const elapsedMs = Date.now() - startedMs;
          console.warn(
            `[StrengthAIService] Model ${modelName} failed after ${elapsedMs}ms:`,
            err?.message || err
          );
        }
      }
    }

    // 5. Fallback determinístico caso a API falhe
    return this.buildDeterministicFallback(
      { ...input, readinessScore, muscleRecovery },
      candidateExercises,
      catalogByKey,
      latestCompletedSetsByExercise
    );
  }

  /**
   * Gera ou adapta fichas corretivas focadas nos pontos fracos identificados
   * pela Avaliação Física por IA, respeitando os dias disponíveis de musculação
   * e a carga multiesportiva semanal (corrida, ciclismo, futevôlei, lutas, etc.).
   */
  async generatePhysiqueCorrectionPlan(
    userId: string,
    assessment: {
      goal: PhysiqueAssessmentGoal;
      result: PhysiqueAssessmentResult;
    },
    options: GeneratePhysiquePlanInput = {}
  ): Promise<{ routines: IStrengthRoutineDocument[]; summary: string }> {
    const availableStrengthDays = Math.min(
      6,
      Math.max(1, Math.round(options.availableStrengthDays ?? 3))
    );
    const mode = options.mode === 'adapt_existing' ? 'adapt_existing' : 'create_new';

    const [dbExercises, recentSessions, userSports, weeklySchedule, existingRoutines] =
      await Promise.all([
        ExerciseModel.find({
          isActive: true,
          $or: [{ isSystem: true }, { ownerId: userId }],
        }).lean(),
        ActiveStrengthSessionModel.find({
          userId,
          status: 'completed',
        })
          .sort({ startedAt: -1 })
          .limit(12)
          .lean(),
        UserSportModel.find({ userId, isActive: true }).lean().catch(() => []),
        WeeklyScheduleModel.findOne({ userId }).lean().catch(() => null),
        mode === 'adapt_existing'
          ? StrengthRoutineModel.find({ userId })
              .sort({ updatedAt: -1 })
              .limit(6)
              .lean()
              .catch(() => [])
          : Promise.resolve([]),
      ]);

    const activeImpactSports = userSports
      .filter((s) => HIGH_IMPACT_LOWER_SPORTS.has(s.sportKey))
      .map((s) => s.displayName || s.sportKey);

    let highImpactWeeklySessions = 0;
    const scheduledSportsSummary: string[] = [];
    for (const day of weeklySchedule?.days || []) {
      if (day.isRestDay) continue;
      for (const workout of day.workouts || []) {
        scheduledSportsSummary.push(workout.sportKey);
        if (HIGH_IMPACT_LOWER_SPORTS.has(workout.sportKey)) {
          highImpactWeeklySessions += 1;
        }
      }
    }

    const limitLowerAndLumbarVolume =
      highImpactWeeklySessions >= 2 || activeImpactSports.length >= 2;

    const catalog =
      dbExercises.length > 0
        ? dbExercises.map((e) => ({
            key: e.key,
            name: e.name,
            primaryMuscleGroup: e.primaryMuscleGroup,
            secondaryMuscleGroups: e.secondaryMuscleGroups || [],
            equipment: e.equipment,
            type: e.type,
          }))
        : SYSTEM_EXERCISES.map((e) => ({
            key: e.key,
            name: e.name,
            primaryMuscleGroup: e.primaryMuscleGroup,
            secondaryMuscleGroups: [] as string[],
            equipment: e.equipment,
            type: e.type,
          }));

    const catalogByKey = new Map(catalog.map((c) => [c.key, c]));

    const latestCompletedSetsByExercise = new Map<string, any[]>();
    for (const past of recentSessions) {
      for (const ex of past.exercises || []) {
        if (!latestCompletedSetsByExercise.has(ex.exerciseKey)) {
          const completedSets = (ex.sets || []).filter((s) => s.status === 'completed');
          if (completedSets.length > 0) {
            latestCompletedSetsByExercise.set(ex.exerciseKey, completedSets);
          }
        }
      }
    }

    const sortedWeakPoints = [...assessment.result.weakPoints].sort((a, b) =>
      a.priority === b.priority
        ? b.targetWeeklySets - a.targetWeeklySets
        : a.priority === 'high'
          ? -1
          : 1
    );

    const weakMusclesSet = new Set(sortedWeakPoints.map((w) => w.muscleGroup));

    const maxRoutines =
      availableStrengthDays <= 2 ? Math.min(2, availableStrengthDays) : availableStrengthDays <= 4 ? 3 : 3;

    let planDraft: {
      summary: string;
      routines: Array<{
        name: string;
        description: string;
        exercises: Array<{
          exerciseKey: string;
          setsCount: number;
          targetReps: number;
          restSeconds: number;
          notes?: string;
        }>;
      }>;
    } | null = null;

    if (this.ai) {
      const primaryModel = getValidGeminiModel(env.GEMINI_MODEL || PRIMARY_GEMINI_MODEL);
      const modelsToTry = Array.from(
        new Set([primaryModel, PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL])
      );

      // Filtra catálogo priorizando os músculos deficitários + exercícios de manutenção
      const weakCatalog = catalog.filter((c) =>
        weakMusclesSet.has(c.primaryMuscleGroup as any)
      );
      const supportCatalog = catalog
        .filter((c) => !weakMusclesSet.has(c.primaryMuscleGroup as any) && c.type === 'compound')
        .slice(0, 20);
      const focusedCatalog = [...weakCatalog, ...supportCatalog];

      const catalogListText = focusedCatalog
        .map(
          (c) =>
            `${c.key} | ${c.name} | músculo:${c.primaryMuscleGroup} | equip:${c.equipment} | tipo:${c.type}`
        )
        .join('\n');

      const weakPointsText = sortedWeakPoints
        .map(
          (w) =>
            `- ${w.muscleGroup} (prioridade: ${w.priority}, meta semanal: ${w.targetWeeklySets} séries, motivo: ${w.technicalReason}, sugestões: ${w.recommendedExerciseNames.join(', ')})`
        )
        .join('\n');

      const multisportContext = `CONTEXTO MULTIESPORTIVO & DISPONIBILIDADE:
- Dias disponíveis para musculação por semana: ${availableStrengthDays} dia(s)/semana (gere no máximo ${maxRoutines} fichas ajustadas a essa frequência).
- Modo escolhido: ${
        mode === 'adapt_existing' && existingRoutines.length > 0
          ? `adapt_existing (adapte e otimize as fichas atuais mantendo compatibilidade e movendo os pontos fracos para o início: ${existingRoutines
              .map(
                (er) =>
                  `${er.name} [${er.exercises.map((e) => e.exerciseKey).slice(0, 6).join(', ')}]`
              )
              .join(' | ')})`
          : 'create_new (crie novas fichas corretivas)'
      }.
- Esportes de impacto ativos no perfil: ${activeImpactSports.length > 0 ? activeImpactSports.join(', ') : 'nenhum'}.
- Sessões semanais agendadas de impacto em membros inferiores/lombar: ${highImpactWeeklySessions} (${scheduledSportsSummary.filter((s) => HIGH_IMPACT_LOWER_SPORTS.has(s)).join(', ') || 'nenhuma'}).
${
  limitLowerAndLumbarVolume
    ? '- RESTRIÇÃO MULTIESPORTIVA CRÍTICA: O atleta já possui alta demanda de membros inferiores/lombar nos esportes aeróbicos/quadra/luta. NÃO prescreva volume excessivo de quadríceps, posteriores, glúteos, panturrilhas ou carga axial lombar pesada (máx. 2 a 3 séries por exercício de perna/lombar; priorize recuperação e parte superior).'
    : '- Carga multiesportiva de inferiores controlada: volume padrão permitido.'
}`;

      const promptText = `Você é o IA Personal Trainer do Pacelog.
Sua missão é ${mode === 'adapt_existing' ? 'adaptar as fichas do atleta ou criar' : 'criar'} de 1 a ${maxRoutines} fichas semanais corretivas para o atleta com base na Avaliação Física por IA.

REGRAS OBRIGATÓRIAS:
- Posicione os exercícios dos PONTOS FRACOS (prioridade high primeiro) SEMPRE NO INÍCIO de cada ficha (primeiros índices), quando o atleta está com energia máxima.
- Ajuste a quantidade de séries ('setsCount') e frequência nas fichas para atingir ou aproximar o 'targetWeeklySets' de cada ponto fraco respeitando os ${availableStrengthDays} dia(s)/semana disponíveis.
- Use EXCLUSIVAMENTE chaves 'exerciseKey' do CATÁLOGO DISPONÍVEL abaixo.
- Objetivo do atleta: ${assessment.goal}
- Divisão sugerida pela avaliação: ${assessment.result.recommendedSplit}

${multisportContext}

PONTOS FRACOS IDENTIFICADOS:
${weakPointsText}

CATÁLOGO DISPONÍVEL:
${catalogListText}

Retorne APENAS um JSON válido no formato:
{
  "summary": "Resumo curto explicando como as fichas priorizam os pontos fracos no início, os ${availableStrengthDays} dias disponíveis e proteção multiesportiva",
  "routines": [
    {
      "name": "Nome da ficha (ex: Correção A — Ombros & Dorsal)",
      "description": "Descrição curta do foco corretivo",
      "exercises": [
        {
          "exerciseKey": "chave_exata_do_catalogo",
          "setsCount": 4,
          "targetReps": 10,
          "restSeconds": 90,
          "notes": "Foco técnico no ponto fraco"
        }
      ]
    }
  ]
}`;

      for (const modelName of modelsToTry) {
        try {
          const response = await this.callGeminiWithTimeout(modelName, promptText, 25000);
          const rawText = response.text?.trim();
          if (!rawText) continue;

          const parsedJson = JSON.parse(rawText);
          const validated = aiCorrectionRoutinesSchema.parse(parsedJson);
          planDraft = validated;
          break;
        } catch (err: any) {
          console.warn(
            `[StrengthAIService] Correction plan failed on ${modelName}:`,
            err?.message || err
          );
        }
      }
    }

    if (!planDraft) {
      planDraft = this.buildDeterministicCorrectionPlan(
        sortedWeakPoints,
        catalog,
        assessment.goal,
        {
          availableStrengthDays,
          limitLowerAndLumbarVolume,
          activeImpactSports,
          highImpactWeeklySessions,
          mode,
          existingRoutinesCount: existingRoutines.length,
        }
      );
    }

    const applyMultisportSafetyCap = (exercises: StrengthRoutineExerciseTemplate[]) => {
      if (!limitLowerAndLumbarVolume) return exercises;
      return exercises.map((ex) => {
        const isLower = LOWER_BODY_MUSCLE_GROUPS.has(ex.primaryMuscleGroup ?? '');
        const isLumbarHeavy = /terra|stiff|agachamento_livre|remada_curvada/i.test(ex.exerciseKey);
        if ((isLower || isLumbarHeavy) && ex.sets.length > 3) {
          return {
            ...ex,
            sets: ex.sets.slice(0, 3),
            notes: ex.notes
              ? `${ex.notes} (Volume moderado p/ preservar carga multiesportiva)`
              : 'Volume moderado p/ preservar carga multiesportiva.',
          };
        }
        return ex;
      });
    };

    const persistRoutineList = async (
      draftRoutines: NonNullable<typeof planDraft>['routines']
    ) => {
      const savedList: IStrengthRoutineDocument[] = [];
      for (let i = 0; i < draftRoutines.length && i < maxRoutines; i++) {
        const r = draftRoutines[i];
        let hydrated = this.hydrateExercisesWithCatalogAndGhostLoads(
          r.exercises,
          catalogByKey,
          latestCompletedSetsByExercise
        );
        if (hydrated.length === 0) continue;

        hydrated = applyMultisportSafetyCap(hydrated);

        // Garantir que exercícios de pontos fracos fiquem ordenados no início da sessão
        hydrated.sort((a, b) => {
          const aWeakIdx = sortedWeakPoints.findIndex(
            (w) => w.muscleGroup === a.primaryMuscleGroup
          );
          const bWeakIdx = sortedWeakPoints.findIndex(
            (w) => w.muscleGroup === b.primaryMuscleGroup
          );
          const aRank = aWeakIdx === -1 ? 999 : aWeakIdx;
          const bRank = bWeakIdx === -1 ? 999 : bWeakIdx;
          return aRank - bRank;
        });
        hydrated.forEach((ex, idx) => {
          ex.order = idx;
        });

        if (mode === 'adapt_existing' && existingRoutines[i]) {
          const updated = await StrengthRoutineModel.findOneAndUpdate(
            { _id: existingRoutines[i]._id, userId },
            {
              $set: {
                name: r.name.slice(0, 80),
                description: r.description.slice(0, 300),
                exercises: hydrated,
              },
            },
            { new: true }
          );
          if (updated) {
            savedList.push(updated);
            continue;
          }
        }

        const created = await StrengthRoutineModel.create({
          userId,
          name: r.name.slice(0, 80),
          description: r.description.slice(0, 300),
          exercises: hydrated,
        });
        savedList.push(created);
      }
      return savedList;
    };

    let resultRoutines = await persistRoutineList(planDraft.routines);

    if (resultRoutines.length === 0) {
      const fallbackPlan = this.buildDeterministicCorrectionPlan(
        sortedWeakPoints,
        catalog,
        assessment.goal,
        {
          availableStrengthDays,
          limitLowerAndLumbarVolume,
          activeImpactSports,
          highImpactWeeklySessions,
          mode,
          existingRoutinesCount: existingRoutines.length,
        }
      );
      resultRoutines = await persistRoutineList(fallbackPlan.routines);
      return { routines: resultRoutines, summary: fallbackPlan.summary };
    }

    return {
      routines: resultRoutines,
      summary: planDraft.summary,
    };
  }

  private buildDeterministicCorrectionPlan(
    weakPoints: PhysiqueAssessmentResult['weakPoints'],
    catalog: Array<{
      key: string;
      name: string;
      primaryMuscleGroup: string;
      equipment: string;
      type: string;
    }>,
    goal: PhysiqueAssessmentGoal,
    context: {
      availableStrengthDays: number;
      limitLowerAndLumbarVolume: boolean;
      activeImpactSports: string[];
      highImpactWeeklySessions: number;
      mode: 'create_new' | 'adapt_existing';
      existingRoutinesCount: number;
    } = {
      availableStrengthDays: 3,
      limitLowerAndLumbarVolume: false,
      activeImpactSports: [],
      highImpactWeeklySessions: 0,
      mode: 'create_new',
      existingRoutinesCount: 0,
    }
  ) {
    const upperWeak = weakPoints.filter((w) => !LOWER_BODY_MUSCLE_GROUPS.has(w.muscleGroup));
    const lowerWeak = weakPoints.filter((w) => LOWER_BODY_MUSCLE_GROUPS.has(w.muscleGroup));

    const targetReps = goal === 'definition' ? 12 : goal === 'athletic' ? 8 : 10;
    const restSeconds = goal === 'athletic' ? 120 : 90;

    const buildExercisesForGroup = (
      groupPoints: PhysiqueAssessmentResult['weakPoints'],
      sessionsPerWeekForSplit: number
    ) => {
      const picked: Array<{
        exerciseKey: string;
        setsCount: number;
        targetReps: number;
        restSeconds: number;
        notes?: string;
      }> = [];
      const usedKeys = new Set<string>();

      for (const wp of groupPoints) {
        const isLower = LOWER_BODY_MUSCLE_GROUPS.has(wp.muscleGroup);
        const effectiveWeeklyTarget =
          isLower && context.limitLowerAndLumbarVolume
            ? Math.min(8, wp.targetWeeklySets)
            : wp.targetWeeklySets;

        const candidates = catalog
          .filter((c) => c.primaryMuscleGroup === wp.muscleGroup)
          .sort((a, b) => {
            const aRec = wp.recommendedExerciseNames.some((n) =>
              a.name.toLowerCase().includes(n.toLowerCase().split(' ')[0])
            )
              ? 1
              : 0;
            const bRec = wp.recommendedExerciseNames.some((n) =>
              b.name.toLowerCase().includes(n.toLowerCase().split(' ')[0])
            )
              ? 1
              : 0;
            if (aRec !== bRec) return bRec - aRec;
            if (a.type === 'compound' && b.type !== 'compound') return -1;
            if (a.type !== 'compound' && b.type === 'compound') return 1;
            return 0;
          });

        const setsNeededPerSession = Math.max(
          2,
          Math.ceil(effectiveWeeklyTarget / sessionsPerWeekForSplit)
        );
        // Se impacto multiesportivo alto, evita multiplicar exercícios para membros inferiores
        const numExercises =
          isLower && context.limitLowerAndLumbarVolume
            ? 1
            : setsNeededPerSession >= 6 && candidates.length >= 2
              ? 2
              : 1;
        let remainingSets = setsNeededPerSession;

        for (let i = 0; i < numExercises && i < candidates.length; i++) {
          const ex = candidates[i];
          if (usedKeys.has(ex.key)) continue;
          usedKeys.add(ex.key);
          const rawSetsHere =
            i === numExercises - 1
              ? Math.min(8, Math.max(2, remainingSets))
              : Math.min(5, Math.ceil(remainingSets / (numExercises - i)));
          const isLumbarHeavy = /terra|stiff|agachamento_livre|remada_curvada/i.test(ex.key);
          const setsHere =
            context.limitLowerAndLumbarVolume && (isLower || isLumbarHeavy)
              ? Math.min(3, rawSetsHere)
              : rawSetsHere;

          remainingSets -= setsHere;
          picked.push({
            exerciseKey: ex.key,
            setsCount: setsHere,
            targetReps,
            restSeconds,
            notes: `Prioridade ${wp.priority === 'high' ? 'ALTA' : 'MÉDIA'} (${effectiveWeeklyTarget} séries/sem): ${wp.technicalReason.slice(0, 110)}`,
          });
        }
      }

      return picked;
    };

    const routines: Array<{
      name: string;
      description: string;
      exercises: Array<{
        exerciseKey: string;
        setsCount: number;
        targetReps: number;
        restSeconds: number;
        notes?: string;
      }>;
    }> = [];

    const freqPerSplit = context.availableStrengthDays >= 4 ? 2 : Math.max(1, Math.min(2, context.availableStrengthDays));

    if (context.availableStrengthDays === 1) {
      // 1 único dia: consolida em ficha única Full Body priorizando pontos fracos
      const allEx = buildExercisesForGroup(weakPoints, 1);
      routines.push({
        name: `Correção IA Full Body (${weakPoints.slice(0, 2).map((w) => w.muscleGroup).join('/')})`.slice(0, 80),
        description: `Ficha única 1x/semana priorizando pontos fracos dentro da disponibilidade semanal.`,
        exercises: allEx.slice(0, 7),
      });
    } else if (upperWeak.length > 0 && lowerWeak.length > 0) {
      const upperEx = buildExercisesForGroup(upperWeak, freqPerSplit);
      const lowerEx = buildExercisesForGroup(lowerWeak, context.limitLowerAndLumbarVolume ? 1 : freqPerSplit);
      const upperRoutine = upperEx.length > 0 ? {
        name: `Foco Pontos Fracos — Superiores (${upperWeak.map((w) => w.muscleGroup).join('/')})`.slice(0, 80),
        description: `Ficha corretiva ajustada para ${context.availableStrengthDays} dias/sem com superiores deficitários no início.`,
        exercises: upperEx.slice(0, 8),
      } : null;
      const lowerRoutine = lowerEx.length > 0 ? {
        name: `Foco Pontos Fracos — Inferiores (${lowerWeak.map((w) => w.muscleGroup).join('/')})`.slice(0, 80),
        description: context.limitLowerAndLumbarVolume
          ? 'Ficha corretiva com volume moderado para preservar recuperação nos outros esportes.'
          : 'Ficha corretiva com grupamentos deficitários inferiores no início da sessão.',
        exercises: lowerEx.slice(0, 8),
      } : null;
      const topIsLower = weakPoints[0] && LOWER_BODY_MUSCLE_GROUPS.has(weakPoints[0].muscleGroup);
      const ordered = topIsLower ? [lowerRoutine, upperRoutine] : [upperRoutine, lowerRoutine];
      for (const item of ordered) {
        if (item) routines.push(item);
      }
    } else {
      const allEx = buildExercisesForGroup(weakPoints, freqPerSplit);
      // Completa com compostos superiores (ou gerais se sem restrição de impacto)
      if (allEx.length < 4) {
        const used = new Set(allEx.map((e) => e.exerciseKey));
        for (const c of catalog
          .filter(
            (x) =>
              x.type === 'compound' &&
              !used.has(x.key) &&
              (!context.limitLowerAndLumbarVolume || !LOWER_BODY_MUSCLE_GROUPS.has(x.primaryMuscleGroup))
          )
          .slice(0, 4 - allEx.length)) {
          allEx.push({
            exerciseKey: c.key,
            setsCount: 3,
            targetReps,
            restSeconds,
            notes: 'Exercício complementar de manutenção estrutural.',
          });
        }
      }
      routines.push({
        name: `Correção IA — ${weakPoints.slice(0, 2).map((w) => w.muscleGroup.toUpperCase()).join(' + ')}`.slice(
          0,
          80
        ),
        description: `Ficha prioritária para ${context.availableStrengthDays} dia(s)/semana ajustada ao volume dos pontos fracos.`,
        exercises: allEx.slice(0, 8),
      });
    }

    const actionVerb =
      context.mode === 'adapt_existing' && context.existingRoutinesCount > 0
        ? 'Adaptamos'
        : 'Geramos';
    const multisportNote = context.limitLowerAndLumbarVolume
      ? ` Volume de inferiores e lombar moderado em razão da carga multiesportiva (${context.activeImpactSports.join(', ') || `${context.highImpactWeeklySessions} sessões/sem`}).`
      : '';

    return {
      summary: `${actionVerb} ${routines.length} ficha(s) para ${context.availableStrengthDays} dia(s)/semana posicionando ${weakPoints.map((w) => w.muscleGroup).join(', ')} no início dos treinos.${multisportNote}`,
      routines,
    };
  }

  private hydrateExercisesWithCatalogAndGhostLoads(
    aiExercises: Array<{
      exerciseKey: string;
      setsCount: number;
      targetReps: number;
      restSeconds: number;
      notes?: string;
    }>,
    catalogByKey: Map<
      string,
      {
        key: string;
        name: string;
        primaryMuscleGroup: string;
        equipment: string;
        type: string;
        secondaryMuscleGroups?: string[];
      }
    >,
    latestCompletedSetsByExercise: Map<string, any[]>
  ): StrengthRoutineExerciseTemplate[] {
    const result: StrengthRoutineExerciseTemplate[] = [];
    const seenKeys = new Set<string>();

    for (const item of aiExercises) {
      const cat = catalogByKey.get(item.exerciseKey);
      if (!cat || seenKeys.has(cat.key)) continue;
      seenKeys.add(cat.key);

      const recentSets = latestCompletedSetsByExercise.get(cat.key);
      const setsCount = Math.max(1, Math.min(8, item.setsCount || 3));

      const sets = Array.from({ length: setsCount }, (_, idx) => {
        const ghostSet = recentSets?.[idx] ?? recentSets?.[recentSets.length - 1];
        return {
          setNumber: idx + 1,
          type: 'working' as const,
          reps: item.targetReps || ghostSet?.reps || 10,
          load: ghostSet?.load,
          loadUnit: (ghostSet?.loadUnit ?? 'kg') as 'kg' | 'lb' | 'bodyweight',
          restSeconds: item.restSeconds || 90,
        };
      });

      result.push({
        exerciseKey: cat.key,
        exerciseNameSnapshot: cat.name,
        primaryMuscleGroup: cat.primaryMuscleGroup,
        equipment: cat.equipment,
        order: result.length,
        notes: item.notes,
        sets,
      });
    }

    return result;
  }

  private buildDeterministicFallback(
    input: GenerateStrengthWorkoutInput,
    candidateExercises: Array<{
      key: string;
      name: string;
      primaryMuscleGroup: string;
      equipment: string;
      type: string;
    }>,
    catalogByKey: Map<string, any>,
    latestCompletedSetsByExercise: Map<string, any[]>
  ): GeneratedStrengthWorkoutDTO {
    const duration = input.durationMinutes ?? 45;
    const targetCount = duration <= 30 ? 4 : duration <= 45 ? 5 : 6;
    const goal = input.goal ?? 'hypertrophy';
    const defaultReps = goal === 'strength' ? 6 : goal === 'endurance' ? 15 : 10;
    const defaultRest = goal === 'strength' ? 120 : goal === 'endurance' ? 60 : 90;
    const volumeMultiplier =
      input.muscleRecovery !== undefined && input.muscleRecovery <= 2
        ? 0.75
        : input.readinessScore !== undefined && input.readinessScore < 60
          ? 0.75
          : input.readinessScore !== undefined && input.readinessScore < 80
            ? 0.9
            : 1;

    // Ordena compostos primeiro, depois isoladores
    const sorted = [...candidateExercises].sort((a, b) => {
      if (a.type === 'compound' && b.type !== 'compound') return -1;
      if (a.type !== 'compound' && b.type === 'compound') return 1;
      return 0;
    });

    const selected = sorted.slice(0, targetCount).map((c) => ({
      exerciseKey: c.key,
      setsCount: Math.max(1, Math.round((c.type === 'compound' ? 4 : 3) * volumeMultiplier)),
      targetReps: defaultReps,
      restSeconds: defaultRest,
      notes:
        c.type === 'compound'
          ? 'Exercício base multiarticular — priorize amplitude e controle.'
          : 'Controle a fase excêntrica e mantenha tensão constante.',
    }));

    const exercises = this.hydrateExercisesWithCatalogAndGhostLoads(
      selected,
      catalogByKey,
      latestCompletedSetsByExercise
    );

    const musclesLabel =
      input.muscleGroups && input.muscleGroups.length > 0
        ? input.muscleGroups.map((m) => m.toUpperCase()).join(' + ')
        : 'FULL BODY / ESTRUTURADO';

    return {
      name: `Treino IA — ${musclesLabel}`,
      description: `Sessão estruturada para ${duration} min com foco em ${
        goal === 'strength'
          ? 'força pura'
          : goal === 'endurance'
          ? 'resistência muscular'
          : 'hipertrofia'
      }.`,
      rationale: `Selecionamos ${exercises.length} exercícios começando pelos movimentos multiarticulares de maior recrutamento seguidos de isoladores complementares, ajustados para janela de ${duration} minutos.`,
      exercises,
      modelUsed: 'deterministic-fallback',
    };
  }
}

export const strengthAIService = new StrengthAIService();
