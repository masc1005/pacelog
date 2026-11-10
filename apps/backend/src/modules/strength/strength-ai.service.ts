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
            thinkingConfig: {
              thinkingBudget: 0,
            },
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
    // 1. Buscar catálogo e histórico recente em paralelo para menor latência de banco
    const [dbExercises, recentSessions] = await Promise.all([
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
    ]);

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

    // 4. Tentar gerar com Gemini com timeout curto por modelo + thinkingBudget: 0
    if (this.ai) {
      // Prioriza gemini-2.5-flash direto (mais estável e rápido sem thinking) e usa gemini-flash-latest como segundo
      const configured = getValidGeminiModel(env.GEMINI_MODEL);
      const modelsToTry = Array.from(
        new Set(['gemini-2.5-flash', configured, 'gemini-2.0-flash'])
      );

      // Formato super compacto para acelerar tokenização de entrada
      const catalogListText = candidateExercises
        .map((c) => `${c.key}(${c.primaryMuscleGroup}/${c.equipment}/${c.type === 'compound' ? 'C' : 'I'})`)
        .join(', ');

      const promptText = `Você é o IA Personal Trainer do Pacelog. Monte um treino de musculação estruturado.
REGRAS:
- Sem diagnósticos médicos ou "risco de lesão".
- Escolha APENAS chaves \`exerciseKey\` do CATÁLOGO abaixo.
- Compostos (C) primeiro, isoladores (I) depois.
- Tempo: ${durationMinutes} min (~30m: 3-4 ex; ~45m: 4-5 ex; ~60m: 5-7 ex; ~75m: 6-8 ex).
- Se grupamento não especificado, sugira complementar aos últimos treinos.

ATLETA:
- Pedido: ${input.prompt?.trim() ? `"${input.prompt.trim()}"` : 'Nenhum'}
- Músculos: ${requestedMuscles.length > 0 ? requestedMuscles.join(', ') : 'Sugerir pelo histórico'}
- Equipamentos: ${requestedEquipment.length > 0 ? requestedEquipment.join(', ') : 'Qualquer'}
- Objetivo: ${goal}
- Histórico recente: ${recentWorkoutsSummary.length > 0 ? recentWorkoutsSummary.join(' | ') : 'Sem histórico'}

CATÁLOGO (chave(músculo/equip/C=composto ou I=isolador)):
${catalogListText}

Retorne APENAS JSON válido:
{
  "name": "Nome curto da ficha",
  "description": "Resumo de 1 linha",
  "rationale": "Explicação direta de 2 frases sobre a escolha e ordem dos exercícios.",
  "exercises": [
    { "exerciseKey": "chave_exata", "setsCount": 4, "targetReps": 10, "restSeconds": 90, "notes": "Dica curta opcional" }
  ]
}`;

      for (const modelName of modelsToTry) {
        const startedMs = Date.now();
        try {
          console.log(`[StrengthAIService] Calling model ${modelName} (timeout 14s)...`);
          const response = await this.callGeminiWithTimeout(modelName, promptText, 14000);

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
            const elapsedMs = Date.now() - startedMs;
            console.log(
              `[StrengthAIService] Generated workout with ${modelName} in ${elapsedMs}ms`
            );
            return {
              name: validated.name,
              description: validated.description,
              rationale: validated.rationale,
              exercises: mappedExercises,
              modelUsed: modelName,
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

    // 5. Fallback determinístico imediato caso a API demore ou falhe
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
