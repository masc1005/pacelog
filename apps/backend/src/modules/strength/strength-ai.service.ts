import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { getValidGeminiModel } from '../insights/insight.service.js';
import { ExerciseModel } from './exercise.model.js';
import { SYSTEM_EXERCISES } from './exercise.seed.js';
import { ActiveStrengthSessionModel } from './strength-session.model.js';
import type {
  GenerateStrengthWorkoutInput,
  GeneratedStrengthWorkoutDTO,
  StrengthRoutineExerciseTemplate,
} from '@pacelog/shared';

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

export class StrengthAIService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }
  }

  async generateWorkout(
    userId: string,
    input: GenerateStrengthWorkoutInput
  ): Promise<GeneratedStrengthWorkoutDTO> {
    // 1. Buscar catálogo de exercícios disponíveis (sistema + custom do usuário)
    const dbExercises = await ExerciseModel.find({
      isActive: true,
      $or: [{ isSystem: true }, { ownerId: userId }],
    }).lean();

    const catalog =
      dbExercises.length > 0
        ? dbExercises.map((e) => ({
            key: e.key,
            name: e.name,
            primaryMuscleGroup: e.primaryMuscleGroup,
            equipment: e.equipment,
            type: e.type,
          }))
        : SYSTEM_EXERCISES.map((e) => ({
            key: e.key,
            name: e.name,
            primaryMuscleGroup: e.primaryMuscleGroup,
            equipment: e.equipment,
            type: e.type,
          }));

    const catalogByKey = new Map(catalog.map((c) => [c.key, c]));

    // 2. Buscar últimas sessões concluídas do usuário para:
    //    a) sugerir qual grupamento treinar se o usuário não especificou
    //    b) preencher as cargas de referência (ghost values) de cada exercício
    const recentSessions = await ActiveStrengthSessionModel.find({
      userId,
      status: 'completed',
    })
      .sort({ startedAt: -1 })
      .limit(15)
      .lean();

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

    // 3. Filtrar catálogo candidato para não estourar tokens se houver filtro explícito,
    //    mas mantendo opções suficientes para um treino completo
    const requestedMuscles = (input.muscleGroups || []).filter(Boolean);
    const requestedEquipment = (input.equipment || []).filter(Boolean);

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

    const durationMinutes = input.durationMinutes ?? 45;
    const goal = input.goal ?? 'hypertrophy';

    // 4. Tentar gerar com Gemini se configurado
    if (this.ai) {
      const primaryModel = getValidGeminiModel(env.GEMINI_MODEL);
      const fallbackModel = 'gemini-2.5-flash';
      const modelsToTry =
        primaryModel === fallbackModel ? [primaryModel] : [primaryModel, fallbackModel];

      const catalogListText = candidateExercises
        .map(
          (c) =>
            `${c.key} | ${c.name} | músculo:${c.primaryMuscleGroup} | equip:${c.equipment} | tipo:${c.type}`
        )
        .join('\n');

      const promptText = `
Você é o IA Personal Trainer do Pacelog (telemetria esportiva).
Sua missão é montar uma ficha/sessão de musculação altamente estruturada, eficiente e personalizada para o atleta.

REGRAS OBRIGATÓRIAS:
- Nunca faça diagnósticos médicos, não mencione "risco de lesão" ou termos clínicos.
- Escolha EXCLUSIVAMENTE exercícios presentes no CATÁLOGO DISPONÍVEL abaixo, usando exatamente a chave \`exerciseKey\`.
- Priorize exercícios compostos (multiarticulares) no início do treino e isoladores depois.
- Ajuste o volume total (quantidade de exercícios e séries) para caber no tempo disponível (${durationMinutes} minutos).
  - ~30 min: 3 a 4 exercícios
  - ~45 min: 4 a 6 exercícios
  - ~60 min: 5 a 7 exercícios
  - ~75+ min: 6 a 8 exercícios
- Se o atleta não especificou grupamentos musculares nem pedido livre, analise os últimos treinos dele e sugira uma sessão complementar lógica (ex.: se treinou Peito/Tríceps por último, sugira Costas/Bíceps ou Pernas).

PARÂMETROS DO ATLETA:
- Pedido livre / foco específico: ${input.prompt?.trim() ? `"${input.prompt.trim()}"` : 'Nenhum pedido específico'}
- Grupamentos selecionados: ${requestedMuscles.length > 0 ? requestedMuscles.join(', ') : 'Sugerir com base no histórico / pedido'}
- Equipamentos preferidos: ${requestedEquipment.length > 0 ? requestedEquipment.join(', ') : 'Qualquer equipamento da academia'}
- Duração alvo: ${durationMinutes} minutos
- Objetivo principal: ${goal}
- Últimos treinos realizados pelo atleta:
${recentWorkoutsSummary.length > 0 ? recentWorkoutsSummary.join('\n') : 'Sem histórico recente registrado.'}

CATÁLOGO DISPONÍVEL (use apenas estas chaves em \`exerciseKey\`):
${catalogListText}

Retorne APENAS um JSON válido com a estrutura:
{
  "name": "Nome curto e forte para a ficha (ex: Push A - Peito, Ombros e Tríceps)",
  "description": "Resumo de 1 linha do foco do treino",
  "rationale": "Explicação direta do IA Personal (2 a 3 frases) sobre por que essa combinação e ordem de exercícios foi escolhida para o tempo/objetivo do atleta.",
  "exercises": [
    {
      "exerciseKey": "chave_exata_do_catalogo",
      "setsCount": 4,
      "targetReps": 10,
      "restSeconds": 90,
      "notes": "Dica técnica curta de execução ou cadência (opcional)"
    }
  ]
}
`;

      for (const modelName of modelsToTry) {
        try {
          console.log(`[StrengthAIService] Executing Gemini model: ${modelName}`);
          const response = await this.ai.models.generateContent({
            model: modelName,
            contents: promptText,
            config: {
              temperature: 0.4,
              responseMimeType: 'application/json',
            },
          });

          const rawText = response.text?.trim();
          if (!rawText) continue;

          const parsedJson = JSON.parse(rawText);
          const validated = aiGeneratedWorkoutSchema.parse(parsedJson);

          const mappedExercises = this.hydrateExercisesWithCatalogAndGhostLoads(
            validated.exercises,
            catalogByKey,
            latestCompletedSetsByExercise
          );

          if (mappedExercises.length > 0) {
            console.log(
              `[StrengthAIService] Successfully generated workout using model: ${modelName}`
            );
            return {
              name: validated.name,
              description: validated.description,
              rationale: validated.rationale,
              exercises: mappedExercises,
              modelUsed: modelName,
            };
          }
        } catch (err) {
          console.warn(`[StrengthAIService] Model ${modelName} failed:`, err);
        }
      }
    }

    // 5. Fallback determinístico caso GEMINI_API_KEY não esteja configurada ou falhe
    return this.buildDeterministicFallback(
      input,
      candidateExercises,
      catalogByKey,
      latestCompletedSetsByExercise
    );
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

    // Ordena compostos primeiro, depois isoladores
    const sorted = [...candidateExercises].sort((a, b) => {
      if (a.type === 'compound' && b.type !== 'compound') return -1;
      if (a.type !== 'compound' && b.type === 'compound') return 1;
      return 0;
    });

    const selected = sorted.slice(0, targetCount).map((c) => ({
      exerciseKey: c.key,
      setsCount: c.type === 'compound' ? 4 : 3,
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
