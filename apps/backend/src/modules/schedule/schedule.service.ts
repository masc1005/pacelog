import { randomUUID } from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { env } from '../../config/env.js';
import {
  getValidGeminiModel,
  FALLBACK_GEMINI_MODEL,
} from '../insights/insight.service.js';
import { WeeklyScheduleModel, type IWeeklyScheduleDocument } from './schedule.model.js';
import { StrengthRoutineModel, type IStrengthRoutineDocument } from '../strength/strength-routine.model.js';
import { SessionModel } from '../sessions/session.model.js';
import { ActiveStrengthSessionModel } from '../strength/strength-session.model.js';
import { DailyReadinessModel } from '../readiness/readiness.model.js';
import { SPORT_KEYS, type SportKey } from '@pacelog/shared';
import type {
  WeeklyScheduleDayPlan,
  WeeklyScheduleWorkoutItem,
  UpdateWeeklyScheduleDayInput,
  UpdateWeeklyScheduleInput,
  GenerateAIScheduleInput,
  GeneratedWeeklyScheduleDTO,
} from '@pacelog/shared';

const WEEKDAY_NAMES_PT: Record<number, string> = {
  0: 'Segunda-feira',
  1: 'Terça-feira',
  2: 'Quarta-feira',
  3: 'Quinta-feira',
  4: 'Sexta-feira',
  5: 'Sábado',
  6: 'Domingo',
};

const SPORT_NAMES_PT: Record<SportKey, string> = {
  running: 'Corrida',
  football: 'Futebol',
  futevolei: 'Futevôlei',
  boxing: 'Boxe',
  strength: 'Musculação',
  swimming: 'Natação',
  cycling: 'Ciclismo',
  jiujitsu: 'Jiu-Jitsu',
};

const DEFAULT_DURATION_BY_SPORT: Record<SportKey, number> = {
  running: 45,
  football: 60,
  futevolei: 60,
  boxing: 60,
  strength: 50,
  swimming: 45,
  cycling: 60,
  jiujitsu: 60,
};

const LOWER_HEAVY_SPORTS = new Set<SportKey>(['running', 'football', 'futevolei', 'cycling']);
const UPPER_HEAVY_SPORTS = new Set<SportKey>(['boxing', 'jiujitsu', 'swimming']);

const aiGeneratedScheduleResponseSchema = z.object({
  rationale: z.string().min(10).max(900),
  days: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        isRestDay: z.boolean().default(false),
        workouts: z
          .array(
            z.object({
              sportKey: z.enum(SPORT_KEYS),
              title: z.string().max(100).optional(),
              routineId: z.string().optional().nullable(),
              routineName: z.string().max(100).optional().nullable(),
              targetDurationMinutes: z.number().int().min(10).max(360).optional(),
              plannedTime: z.string().max(10).optional().nullable(),
              notes: z.string().max(300).optional().nullable(),
            })
          )
          .default([]),
      })
    )
    .min(7)
    .max(7),
});

function createDefaultDays(): WeeklyScheduleDayPlan[] {
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    isRestDay: weekday === 6, // 6 = Domingo como descanso por padrão inicial (0 = Segunda ... 6 = Domingo)
    workouts: [],
  }));
}

function normalizeDays(days: WeeklyScheduleDayPlan[]): WeeklyScheduleDayPlan[] {
  const map = new Map<number, WeeklyScheduleDayPlan>();
  for (const d of days || []) {
    if (d.weekday >= 0 && d.weekday <= 6) {
      map.set(d.weekday, {
        weekday: d.weekday,
        isRestDay: Boolean(d.isRestDay),
        workouts: d.isRestDay
          ? []
          : (d.workouts || []).map((w) => ({
              id: w.id || randomUUID(),
              sportKey: w.sportKey,
              title: w.title?.trim() || undefined,
              routineId: w.routineId || undefined,
              routineName: w.routineName?.trim() || undefined,
              targetDurationMinutes: w.targetDurationMinutes,
              plannedTime: w.plannedTime?.trim() || undefined,
              notes: w.notes?.trim() || undefined,
              volumeMultiplier: w.volumeMultiplier,
              targetRpe: w.targetRpe,
            })),
      });
    }
  }

  return Array.from({ length: 7 }, (_, weekday) => {
    return (
      map.get(weekday) ?? {
        weekday,
        isRestDay: false,
        workouts: [],
      }
    );
  });
}

function isRoutineLowerBodyFocused(routine: {
  name?: string;
  exercises?: Array<{ primaryMuscleGroup?: string }>;
}): boolean {
  const nameLower = (routine.name || '').toLowerCase();
  if (/perna|leg|inferior|quadr|gl[uú]teo|posterior/i.test(nameLower)) return true;
  const exs = routine.exercises || [];
  if (exs.length === 0) return false;
  const lowerCount = exs.filter((e) =>
    ['quadriceps', 'posteriores', 'gluteos', 'panturrilhas'].includes(
      (e.primaryMuscleGroup || '').toLowerCase()
    )
  ).length;
  return lowerCount / exs.length >= 0.5;
}

export class WeeklyScheduleService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }
  }

  async getSchedule(userId: string): Promise<IWeeklyScheduleDocument> {
    let schedule = await WeeklyScheduleModel.findOne({ userId });
    if (!schedule) {
      schedule = await WeeklyScheduleModel.create({
        userId,
        days: createDefaultDays(),
      });
    } else if (!schedule.days || schedule.days.length < 7) {
      schedule.days = normalizeDays(schedule.days || []);
      await schedule.save();
    }
    return schedule;
  }

  async updateDay(
    userId: string,
    input: UpdateWeeklyScheduleDayInput
  ): Promise<IWeeklyScheduleDocument> {
    const schedule = await this.getSchedule(userId);
    const currentDays = normalizeDays(schedule.days);

    const updatedDay: WeeklyScheduleDayPlan = {
      weekday: input.weekday,
      isRestDay: Boolean(input.isRestDay),
      workouts: input.isRestDay
        ? []
        : (input.workouts || []).map((w) => ({
            id: w.id || randomUUID(),
            sportKey: w.sportKey,
            title: w.title?.trim() || undefined,
            routineId: w.routineId || undefined,
            routineName: w.routineName?.trim() || undefined,
            targetDurationMinutes: w.targetDurationMinutes,
            plannedTime: w.plannedTime?.trim() || undefined,
            notes: w.notes?.trim() || undefined,
            volumeMultiplier: w.volumeMultiplier,
            targetRpe: w.targetRpe,
          })),
    };

    const nextDays = currentDays.map((d) =>
      d.weekday === input.weekday ? updatedDay : d
    );

    schedule.days = nextDays;
    return schedule.save();
  }

  async updateFullSchedule(
    userId: string,
    input: UpdateWeeklyScheduleInput
  ): Promise<IWeeklyScheduleDocument> {
    const schedule = await this.getSchedule(userId);
    const mergedMap = new Map<number, WeeklyScheduleDayPlan>();

    for (const d of normalizeDays(schedule.days)) {
      mergedMap.set(d.weekday, d);
    }

    for (const d of input.days) {
      mergedMap.set(d.weekday, {
        weekday: d.weekday,
        isRestDay: Boolean(d.isRestDay),
        workouts: d.isRestDay
          ? []
          : (d.workouts || []).map((w) => ({
              id: w.id || randomUUID(),
              sportKey: w.sportKey,
              title: w.title?.trim() || undefined,
              routineId: w.routineId || undefined,
              routineName: w.routineName?.trim() || undefined,
              targetDurationMinutes: w.targetDurationMinutes,
              plannedTime: w.plannedTime?.trim() || undefined,
              notes: w.notes?.trim() || undefined,
              volumeMultiplier: w.volumeMultiplier,
              targetRpe: w.targetRpe,
            })),
      });
    }

    schedule.days = Array.from({ length: 7 }, (_, idx) => mergedMap.get(idx)!);
    return schedule.save();
  }

  async activateDeloadMode(userId: string): Promise<IWeeklyScheduleDocument> {
    const schedule = await this.getSchedule(userId);
    schedule.days = normalizeDays(schedule.days).map((day) => ({
      ...day,
      workouts: day.workouts.map((workout) => ({
        ...workout,
        volumeMultiplier: 0.6,
        targetRpe: 6,
        notes: [workout.notes, 'Modo Deload Semanal: volume -40%, RPE-alvo 6.']
          .filter(Boolean)
          .join(' '),
      })),
    }));
    return schedule.save();
  }

  async generateScheduleWithAI(
    userId: string,
    input: GenerateAIScheduleInput
  ): Promise<GeneratedWeeklyScheduleDTO> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [routines, recentGeneralSessions, recentStrengthSessions, latestReadiness] =
      await Promise.all([
        StrengthRoutineModel.find({ userId }).sort({ updatedAt: -1 }).lean().catch(() => []),
        SessionModel.find({
          userId,
          status: 'completed',
          startedAt: { $gte: sevenDaysAgo },
        })
          .sort({ startedAt: -1 })
          .limit(20)
          .lean()
          .catch(() => []),
        ActiveStrengthSessionModel.find({
          userId,
          status: 'completed',
          startedAt: { $gte: sevenDaysAgo },
        })
          .sort({ startedAt: -1 })
          .limit(10)
          .lean()
          .catch(() => []),
        DailyReadinessModel.findOne({ userId })
          .sort({ dateKey: -1 })
          .lean()
          .catch(() => null),
      ]);

    const deterministicPlan = this.buildDeterministicAISchedule(input, routines);

    if (!this.ai) {
      return deterministicPlan;
    }

    try {
      const routinesById = new Map<string, any>();
      for (const r of routines) {
        const id = String((r as any)._id ?? (r as any).id);
        routinesById.set(id, r);
      }

      const routinesDesc =
        routines.length > 0
          ? routines
              .map((r: any) => {
                const id = String(r._id ?? r.id);
                const muscles = Array.from(
                  new Set(
                    (r.exercises || [])
                      .map((e: any) => e.primaryMuscleGroup)
                      .filter(Boolean)
                  )
                ).join(', ');
                return `- ID: "${id}" | Nome: "${r.name}" | Grupamentos: ${muscles || 'Geral'} (${(r.exercises || []).length} exercícios)`;
              })
              .join('\n')
          : 'Nenhuma ficha de musculação salva (use divisões clássicas nos títulos como Treino A/B/C ou Push/Pull/Legs).';

      const requestedActivitiesDesc = input.activities
        .map((act) => {
          const sportName = SPORT_NAMES_PT[act.sportKey] || act.sportKey;
          const fixedNames =
            act.fixedWeekdays && act.fixedWeekdays.length > 0
              ? act.fixedWeekdays.map((d) => `${d} (${WEEKDAY_NAMES_PT[d]})`).join(', ')
              : 'Nenhum dia fixo obrigatório (distribuir nos melhores dias)';
          const dur = act.targetDurationMinutes || DEFAULT_DURATION_BY_SPORT[act.sportKey] || 45;
          const timeInfo = act.plannedTime ? ` | Horário preferido: ${act.plannedTime}` : '';
          return `- ${sportName} (sportKey: "${act.sportKey}"): ${act.sessionsPerWeek}x na semana | Dias fixos: [${fixedNames}] | Duração alvo: ${dur} min${timeInfo}`;
        })
        .join('\n');

      const restDaysDesc =
        input.restWeekdays && input.restWeekdays.length > 0
          ? input.restWeekdays.map((d) => `${d} (${WEEKDAY_NAMES_PT[d]})`).join(', ')
          : 'Nenhum dia off fixado pelo usuário (escolha pelo menos 1 dia de descanso se possível)';

      const recentCount = recentGeneralSessions.length + recentStrengthSessions.length;
      const readinessContext = latestReadiness
        ? `Última prontidão: score ${latestReadiness.readinessScore}/100 (${latestReadiness.readinessStatus})${
            latestReadiness.soreRegions?.length
              ? `, regiões doloridas: ${latestReadiness.soreRegions.join(', ')}`
              : ''
          }.`
        : 'Sem check-in de prontidão recente.';

      const prompt = `Você é o Coach Estrategista de Periodização Multiesportiva (Atleta Híbrido) do aplicativo PACELOG.
Sua missão é montar o CRONOGRAMA SEMANAL COMPLETO de 7 dias (0 = Segunda-feira, 1 = Terça-feira, 2 = Quarta-feira, 3 = Quinta-feira, 4 = Sexta-feira, 5 = Sábado, 6 = Domingo).

## ATIVIDADES E FREQUÊNCIAS SOLICITADAS PELO ATLETA:
${requestedActivitiesDesc}

## RESTRIÇÕES E PREFERÊNCIAS DO ATLETA:
- Dias de Descanso (Off) obrigatórios solicitados: ${restDaysDesc}
- Permitir 2 treinos no mesmo dia (double sessions) se necessário: ${input.allowDoubleSessions ? 'Sim' : 'Evitar ao máximo (apenas se o total de sessões exceder os dias disponíveis)'}
- Observações adicionais do atleta: ${input.notes?.trim() ? `"${input.notes.trim()}"` : 'Nenhuma'}

## FICHAS DE MUSCULAÇÃO SALVAS DO ATLETA (vincule routineId e routineName nos treinos de "strength" quando aplicável):
${routinesDesc}

## CONTEXTO FISIOLÓGICO RECENTE (ÚLTIMOS 7 DIAS):
- Total de sessões nos últimos 7 dias: ${recentCount}
- ${readinessContext}

## REGRAS OBRIGATÓRIAS DE MONTAGEM DO CRONOGRAMA:
1. RESPEITE ESTRITAMENTE OS DIAS FIXOS: Se o atleta definiu dias fixos para uma atividade (ex: Boxe no Sábado weekday=5), essa modalidade DEVE estar agendada nesses dias fixos.
2. RESPEITE A FREQUÊNCIA SEMANAL (sessionsPerWeek): O número total de sessões de cada modalidade na semana deve corresponder ao solicitado pelo atleta.
3. CONTROLE DE INTERFERÊNCIA (ATLETA HÍBRIDO):
   - Evite colocar treino de Musculação focado em Pernas/Inferiores no mesmo dia ou na véspera imediata de esportes pesados de membros inferiores (Corrida longa/tiros, Futebol, Futevôlei, Ciclismo intenso), sempre que houver outros dias disponíveis.
   - Espalhe sessões da mesma modalidade ao longo da semana para otimizar a recuperação (evite dias consecutivos da mesma modalidade de alto impacto quando possível).
   - Se o atleta tiver fichas de musculação salvas, alterne-as de forma lógica nos dias de "strength", preenchendo "routineId" e "routineName" exatamente como fornecidos.
4. Para cada treino planejado, preencha um "title" claro e motivador (ex: "Boxe Técnico & Sparring", "Corrida Base / Ritmo", ou o nome da ficha de musculação) e uma "notes" curta com dica tática de distribuição/recuperação.
5. Dias sem nenhum treino planejado devem ter "isRestDay": true e "workouts": []. Dias com treinos devem ter "isRestDay": false.
6. Retorne EXATAMENTE os 7 dias da semana (weekday de 0 a 6) em formato JSON estrito.

## FORMATO JSON DE SAÍDA:
{
  "rationale": "Explicação tática curta (2 a 4 frases) do porquê o cronograma foi distribuído dessa forma, destacando como os dias fixos foram respeitados e como a fadiga entre modalidades foi equilibrada.",
  "days": [
    {
      "weekday": 0,
      "isRestDay": false,
      "workouts": [
        {
          "sportKey": "strength",
          "title": "Nome do treino ou ficha",
          "routineId": "id_da_ficha_se_houver_ou_null",
          "routineName": "nome_da_ficha_se_houver_ou_null",
          "targetDurationMinutes": 50,
          "plannedTime": "18:00",
          "notes": "Foco técnico ou observação de recuperação"
        }
      ]
    }
  ]
}`;

      const primaryModel = getValidGeminiModel(env.GEMINI_MODEL);
      const fallbackModel = FALLBACK_GEMINI_MODEL;
      let response: any = null;
      let modelUsed = primaryModel;

      try {
        response = await this.ai.models.generateContent({
          model: primaryModel,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
        modelUsed = response?.modelVersion
          ? `${primaryModel} (${response.modelVersion})`
          : primaryModel;
      } catch (primaryErr) {
        console.warn(
          `[WeeklyScheduleService] Primary model ${primaryModel} failed, trying fallback ${fallbackModel}:`,
          primaryErr
        );
        response = await this.ai.models.generateContent({
          model: fallbackModel,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
        modelUsed = response?.modelVersion
          ? `${fallbackModel} (${response.modelVersion}) [fallback]`
          : `${fallbackModel} [fallback]`;
      }

      const rawText = (response?.text || '').trim();
      const jsonMatch =
        rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
        rawText.match(/(\{[\s\S]*\})/);
      const parsedJson = JSON.parse(jsonMatch ? jsonMatch[1].trim() : rawText);
      const validated = aiGeneratedScheduleResponseSchema.parse(parsedJson);

      const enforcedDays = this.enforceConstraintsOnDays(
        validated.days,
        input,
        routinesById,
        routines
      );

      return {
        rationale: validated.rationale,
        modelUsed,
        days: enforcedDays,
      };
    } catch (err) {
      console.warn(
        '[WeeklyScheduleService] AI schedule generation fallback to deterministic planner:',
        err
      );
      return deterministicPlan;
    }
  }

  /**
   * Garante que todos os 7 dias existam, que os dias fixos solicitados pelo usuário
   * nunca sejam perdidos mesmo se a IA omitir algum, e valida routineIds.
   */
  private enforceConstraintsOnDays(
    aiDays: Array<{
      weekday: number;
      isRestDay: boolean;
      workouts: Array<{
        sportKey: SportKey;
        title?: string;
        routineId?: string | null;
        routineName?: string | null;
        targetDurationMinutes?: number;
        plannedTime?: string | null;
        notes?: string | null;
      }>;
    }>,
    input: GenerateAIScheduleInput,
    routinesById: Map<string, any>,
    routines: any[]
  ): WeeklyScheduleDayPlan[] {
    const dayMap = new Map<number, WeeklyScheduleDayPlan>();

    for (let weekday = 0; weekday < 7; weekday++) {
      const found = aiDays.find((d) => d.weekday === weekday);
      const workouts: WeeklyScheduleWorkoutItem[] = (found?.workouts || []).map((w) => {
        const validRoutine =
          w.sportKey === 'strength' && w.routineId && routinesById.has(w.routineId)
            ? routinesById.get(w.routineId)
            : undefined;
        const pref = input.activities.find((a) => a.sportKey === w.sportKey);

        return {
          id: randomUUID(),
          sportKey: w.sportKey,
          title:
            w.title?.trim() ||
            validRoutine?.name ||
            SPORT_NAMES_PT[w.sportKey] ||
            'Treino',
          routineId: validRoutine ? String(validRoutine._id ?? validRoutine.id) : undefined,
          routineName: validRoutine ? validRoutine.name : undefined,
          targetDurationMinutes:
            w.targetDurationMinutes ||
            pref?.targetDurationMinutes ||
            DEFAULT_DURATION_BY_SPORT[w.sportKey] ||
            45,
          plannedTime: w.plannedTime?.trim() || pref?.plannedTime || undefined,
          notes: w.notes?.trim() || undefined,
        };
      });

      dayMap.set(weekday, {
        weekday,
        isRestDay: workouts.length === 0,
        workouts,
      });
    }

    // Garante que todos os dias fixos solicitados contenham a atividade
    let routineIdx = 0;
    for (const act of input.activities) {
      const uniqueFixed = Array.from(new Set(act.fixedWeekdays || [])).filter(
        (d) => d >= 0 && d <= 6
      );
      for (const fixedDay of uniqueFixed) {
        const dayPlan = dayMap.get(fixedDay)!;
        const alreadyHasSport = dayPlan.workouts.some((w) => w.sportKey === act.sportKey);
        if (!alreadyHasSport) {
          const chosenRoutine =
            act.sportKey === 'strength' && routines.length > 0
              ? routines[routineIdx++ % routines.length]
              : undefined;
          dayPlan.workouts.push({
            id: randomUUID(),
            sportKey: act.sportKey,
            title: chosenRoutine?.name || SPORT_NAMES_PT[act.sportKey],
            routineId: chosenRoutine ? String(chosenRoutine._id ?? chosenRoutine.id) : undefined,
            routineName: chosenRoutine?.name,
            targetDurationMinutes:
              act.targetDurationMinutes || DEFAULT_DURATION_BY_SPORT[act.sportKey] || 45,
            plannedTime: act.plannedTime || undefined,
            notes: `Dia fixo definido para ${SPORT_NAMES_PT[act.sportKey]}.`,
          });
          dayPlan.isRestDay = false;
        }
      }
    }

    return Array.from({ length: 7 }, (_, weekday) => {
      const plan = dayMap.get(weekday)!;
      return {
        weekday,
        isRestDay: plan.workouts.length === 0,
        workouts: plan.workouts,
      };
    });
  }

  /**
   * Planejador determinístico inteligente:
   * 1. Aloca todos os dias fixos solicitados pelo usuário (ex: Sábado = Boxe)
   * 2. Distribui as sessões restantes evitando dias de descanso solicitados,
   *    minimizando conflito de membros inferiores e espaçando sessões da mesma modalidade.
   */
  public buildDeterministicAISchedule(
    input: GenerateAIScheduleInput,
    routines: Array<any> = []
  ): GeneratedWeeklyScheduleDTO {
    const days: WeeklyScheduleDayPlan[] = Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      isRestDay: false,
      workouts: [],
    }));

    const restSet = new Set<number>(input.restWeekdays || []);

    // Separar fichas de musculação entre inferiores e superiores/geral para evitar choque com corrida/futebol
    const lowerRoutines = routines.filter((r) => isRoutineLowerBodyFocused(r));
    const otherRoutines = routines.filter((r) => !isRoutineLowerBodyFocused(r));
    let routineCursor = 0;

    const pickRoutineForDay = (weekday: number): any | undefined => {
      if (routines.length === 0) return undefined;

      const adjacentDays = [weekday, (weekday + 6) % 7, (weekday + 1) % 7];
      const hasAdjacentLowerSport = adjacentDays.some((d) =>
        days[d].workouts.some((w) => LOWER_HEAVY_SPORTS.has(w.sportKey))
      );

      if (hasAdjacentLowerSport && otherRoutines.length > 0) {
        const picked = otherRoutines[routineCursor % otherRoutines.length];
        routineCursor++;
        return picked;
      }

      const orderedPool = [...otherRoutines, ...lowerRoutines];
      const picked = orderedPool[routineCursor % orderedPool.length];
      routineCursor++;
      return picked;
    };

    const createWorkoutItem = (
      act: GenerateAIScheduleInput['activities'][number],
      weekday: number,
      isFixed: boolean
    ): WeeklyScheduleWorkoutItem => {
      const chosenRoutine =
        act.sportKey === 'strength' ? pickRoutineForDay(weekday) : undefined;
      const sportName = SPORT_NAMES_PT[act.sportKey] || act.sportKey;
      const duration =
        act.targetDurationMinutes || DEFAULT_DURATION_BY_SPORT[act.sportKey] || 45;

      return {
        id: randomUUID(),
        sportKey: act.sportKey,
        title: chosenRoutine?.name || sportName,
        routineId: chosenRoutine ? String(chosenRoutine._id ?? chosenRoutine.id) : undefined,
        routineName: chosenRoutine?.name,
        targetDurationMinutes: duration,
        plannedTime: act.plannedTime?.trim() || undefined,
        notes: isFixed
          ? `Dia fixo na ${WEEKDAY_NAMES_PT[weekday]}.`
          : chosenRoutine
            ? `Ficha vinculada: ${chosenRoutine.name}.`
            : `Distribuído pela IA para equilíbrio de carga semanal.`,
      };
    };

    // Passo 1: Alocar todos os dias fixos primeiro
    const remainingByActivity = new Map<number, number>();
    input.activities.forEach((act, idx) => {
      const uniqueFixed = Array.from(new Set(act.fixedWeekdays || [])).filter(
        (d) => d >= 0 && d <= 6
      );
      let placed = 0;
      for (const weekday of uniqueFixed) {
        restSet.delete(weekday); // Dia fixo tem prioridade sobre descanso
        days[weekday].workouts.push(createWorkoutItem(act, weekday, true));
        placed++;
      }
      remainingByActivity.set(idx, Math.max(0, act.sessionsPerWeek - placed));
    });

    // Passo 2: Alocar sessões restantes priorizando primeiro esportes de impacto e depois musculação
    const activityOrder = input.activities
      .map((act, idx) => ({ act, idx }))
      .sort((a, b) => {
        if (a.act.sportKey === 'strength' && b.act.sportKey !== 'strength') return 1;
        if (a.act.sportKey !== 'strength' && b.act.sportKey === 'strength') return -1;
        return b.act.sessionsPerWeek - a.act.sessionsPerWeek;
      });

    for (const { act, idx } of activityOrder) {
      let remaining = remainingByActivity.get(idx) ?? 0;

      while (remaining > 0) {
        let bestWeekday = -1;
        let bestScore = -Infinity;

        for (let weekday = 0; weekday < 7; weekday++) {
          const dayWorkouts = days[weekday].workouts;
          const alreadyHasSameSport = dayWorkouts.some(
            (w) => w.sportKey === act.sportKey
          );

          let score = 100;

          if (restSet.has(weekday)) {
            score -= 500;
          }

          if (alreadyHasSameSport) {
            score -= 350;
          }

          if (dayWorkouts.length > 0) {
            score -= input.allowDoubleSessions ? dayWorkouts.length * 45 : dayWorkouts.length * 220;
          }

          // Evitar dias consecutivos da mesma modalidade
          const prevDay = (weekday + 6) % 7;
          const nextDay = (weekday + 1) % 7;
          if (days[prevDay].workouts.some((w) => w.sportKey === act.sportKey)) {
            score -= 55;
          }
          if (days[nextDay].workouts.some((w) => w.sportKey === act.sportKey)) {
            score -= 55;
          }

          // Evitar empilhar esportes pesados de membros inferiores no mesmo dia
          if (LOWER_HEAVY_SPORTS.has(act.sportKey)) {
            if (dayWorkouts.some((w) => LOWER_HEAVY_SPORTS.has(w.sportKey))) {
              score -= 90;
            }
            if (
              days[prevDay].workouts.some((w) => LOWER_HEAVY_SPORTS.has(w.sportKey)) ||
              days[nextDay].workouts.some((w) => LOWER_HEAVY_SPORTS.has(w.sportKey))
            ) {
              score -= 25;
            }
          }

          // Evitar empilhar esportes pesados de membros superiores no mesmo dia
          if (UPPER_HEAVY_SPORTS.has(act.sportKey)) {
            if (dayWorkouts.some((w) => UPPER_HEAVY_SPORTS.has(w.sportKey))) {
              score -= 60;
            }
          }

          // Leve preferência por dias úteis quando empatado, deixando domingo mais livre se não fixado
          if (weekday === 6 && dayWorkouts.length === 0) {
            score -= 15;
          }

          if (score > bestScore) {
            bestScore = score;
            bestWeekday = weekday;
          }
        }

        if (bestWeekday === -1) bestWeekday = 0;
        days[bestWeekday].workouts.push(createWorkoutItem(act, bestWeekday, false));
        remaining--;
      }
    }

    // Passo 3: Re-hidratar fichas de musculação agora que todos os outros esportes estão posicionados
    if (routines.length > 0) {
      routineCursor = 0;
      for (let weekday = 0; weekday < 7; weekday++) {
        for (const workout of days[weekday].workouts) {
          if (workout.sportKey === 'strength' && !workout.routineId) {
            const picked = pickRoutineForDay(weekday);
            if (picked) {
              workout.routineId = String(picked._id ?? picked.id);
              workout.routineName = picked.name;
              workout.title = picked.name;
            }
          }
        }
      }
    }

    // Passo 4: Marcar dias sem treino como isRestDay = true
    const finalDays = days.map((d) => ({
      weekday: d.weekday,
      isRestDay: d.workouts.length === 0,
      workouts: d.workouts,
    }));

    const fixedSummaryParts: string[] = [];
    for (const act of input.activities) {
      if (act.fixedWeekdays && act.fixedWeekdays.length > 0) {
        const names = act.fixedWeekdays.map((d) => WEEKDAY_NAMES_PT[d]).join(', ');
        fixedSummaryParts.push(`${SPORT_NAMES_PT[act.sportKey]} fixado em ${names}`);
      }
    }

    const totalSessions = finalDays.reduce((acc, d) => acc + d.workouts.length, 0);
    const restCount = finalDays.filter((d) => d.isRestDay).length;

    const rationale = [
      `Distribuímos ${totalSessions} sessão(ões) ao longo da semana com ${restCount} dia(s) de recuperação (Off).`,
      fixedSummaryParts.length > 0
        ? `Respeitamos seus dias fixos (${fixedSummaryParts.join('; ')}) e alocamos as demais sessões espaçando os estímulos musculares para reduzir interferência entre modalidades.`
        : 'Espaçamos as modalidades ao longo dos 7 dias para evitar sobrecarga consecutiva nos mesmos grupos musculares.',
      routines.length > 0 && input.activities.some((a) => a.sportKey === 'strength')
        ? `Suas fichas de musculação salvas foram vinculadas automaticamente evitando choque de membros inferiores com dias de corrida ou esporte de impacto.`
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    return {
      rationale,
      modelUsed: 'deterministic-planner',
      days: finalDays,
    };
  }
}

export const weeklyScheduleService = new WeeklyScheduleService();
