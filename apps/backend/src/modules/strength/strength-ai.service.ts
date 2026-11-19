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
import { SessionModel } from '../sessions/session.model.js';
import { SPORT_MUSCLE_IMPACT } from '../sessions/sport.rules.js';
import { DailyReadinessModel } from '../readiness/readiness.model.js';
import { UserSettingsModel } from '../settings/settings.model.js';
import { UserSportModel } from '../settings/userSport.model.js';
import { WeeklyScheduleModel } from '../schedule/schedule.model.js';
import { StrengthRoutineModel, type IStrengthRoutineDocument } from './strength-routine.model.js';
import { progressService } from '../progress/progress.service.js';
import { applyFatigueDecay } from '../progress/fatigue.js';
import { formatDateInTimeZone, resolveValidTimeZone } from '../progress/streak.service.js';
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

const LOWER_BODY_IMPACT_SPORTS = new Set([
  'running',
  'cycling',
  'futevolei',
  'football',
]);

const UPPER_IMPACT_SPORTS = new Set([
  'boxing',
  'jiujitsu',
  'swimming',
]);

const LOWER_BODY_MUSCLE_GROUPS = new Set([
  'quadriceps',
  'posteriores',
  'gluteos',
  'panturrilhas',
]);

const TRACKED_MUSCLE_GROUPS = [
  'peito',
  'costas',
  'ombros',
  'biceps',
  'triceps',
  'quadriceps',
  'posteriores',
  'gluteos',
  'panturrilhas',
  'abdomen',
] as const;

const SPORT_LABELS_PT: Record<string, string> = {
  running: 'Corrida',
  cycling: 'Ciclismo',
  swimming: 'Natação',
  football: 'Futebol',
  futevolei: 'Futevôlei',
  boxing: 'Boxe',
  jiujitsu: 'Jiu-Jitsu',
  strength: 'Musculação',
};

const MUSCLE_LABELS_PT: Record<string, string> = {
  peito: 'Peito',
  costas: 'Costas',
  ombros: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  antebracos: 'Antebraços',
  quadriceps: 'Quadríceps',
  posteriores: 'Posteriores',
  gluteos: 'Glúteos',
  panturrilhas: 'Panturrilhas',
  abdomen: 'Abdômen',
  lombar: 'Lombar',
  corpo_inteiro: 'Corpo Inteiro',
};

const SPORT_REGION_TO_MUSCLE_GROUPS: Record<string, Array<{ group: string; weight: number }>> = {
  quadriceps: [{ group: 'quadriceps', weight: 1 }],
  posteriores: [{ group: 'posteriores', weight: 1 }],
  panturrilhas: [{ group: 'panturrilhas', weight: 1 }],
  gluteos: [{ group: 'gluteos', weight: 1 }],
  joelhos: [
    { group: 'quadriceps', weight: 0.6 },
    { group: 'posteriores', weight: 0.4 },
    { group: 'gluteos', weight: 0.4 },
  ],
  quadris: [
    { group: 'gluteos', weight: 0.5 },
    { group: 'posteriores', weight: 0.3 },
    { group: 'quadriceps', weight: 0.3 },
  ],
  tornozelos: [{ group: 'panturrilhas', weight: 0.6 }],
  ombros: [{ group: 'ombros', weight: 1 }],
  costas: [{ group: 'costas', weight: 1 }],
  lombar: [
    { group: 'costas', weight: 0.6 },
    { group: 'posteriores', weight: 0.4 },
  ],
  peito: [{ group: 'peito', weight: 1 }],
  triceps: [{ group: 'triceps', weight: 1 }],
  biceps: [{ group: 'biceps', weight: 1 }],
  core: [{ group: 'abdomen', weight: 1 }],
  abdomen: [{ group: 'abdomen', weight: 1 }],
  antebracos: [
    { group: 'biceps', weight: 0.5 },
    { group: 'costas', weight: 0.4 },
  ],
  pegada: [
    { group: 'biceps', weight: 0.4 },
    { group: 'costas', weight: 0.5 },
  ],
  cotovelos: [
    { group: 'triceps', weight: 0.5 },
    { group: 'biceps', weight: 0.4 },
  ],
  punhos: [
    { group: 'biceps', weight: 0.3 },
    { group: 'triceps', weight: 0.2 },
  ],
};

const SORE_ALIASES: Record<string, string[]> = {
  core: ['abdomen', 'lombar'],
  pegada: ['antebracos', 'costas', 'biceps'],
  joelhos: ['quadriceps', 'posteriores', 'gluteos'],
  quadris: ['gluteos', 'posteriores', 'quadriceps'],
  tornozelos: ['panturrilhas'],
  cotovelos: ['triceps', 'biceps'],
  punhos: ['antebracos', 'biceps'],
  lombar: ['costas', 'posteriores', 'gluteos'],
};

const COMPLEMENTARY_SPLITS: Array<{ name: string; muscles: string[] }> = [
  { name: 'Push (Peito, Ombros e Tríceps)', muscles: ['peito', 'ombros', 'triceps'] },
  { name: 'Pull (Costas e Bíceps)', muscles: ['costas', 'biceps'] },
  { name: 'Legs (Inferiores Completo)', muscles: ['quadriceps', 'posteriores', 'gluteos', 'panturrilhas'] },
  { name: 'Upper Body (Superiores)', muscles: ['peito', 'costas', 'ombros', 'biceps', 'triceps'] },
];

export interface CatalogExerciseItem {
  key: string;
  name: string;
  primaryMuscleGroup: string;
  secondaryMuscleGroups?: string[];
  equipment: string;
  type: string;
}

export interface SevenDayActivityItem {
  id?: string;
  sportKey: string;
  sportLabel: string;
  dateStr: string;
  daysAgo: number;
  hoursAgo: number;
  durationMinutes: number;
  rpe?: number;
  srpe?: number;
  summaryLine: string;
  musclesHit: string[];
}

export interface MuscleSevenDayStatus {
  muscleGroup: string;
  strengthPrimarySets: number;
  strengthSecondarySets: number;
  strengthSessionsCount: number;
  sportImpactSessionsCount: number;
  impactingSports: string[];
  lastStimulatedHoursAgo: number | null;
  fatigueScore: number;
  recoveryReadinessScore: number;
}

export interface SevenDayActivityContext {
  windowStartIso: string;
  totalSessions: number;
  strengthSessionsCount: number;
  otherSportsSessionsCount: number;
  totalDurationMinutes: number;
  totalSrpeLoad: number;
  sportsPracticed: string[];
  activities: SevenDayActivityItem[];
  activityLines: string[];
  muscleStatuses: MuscleSevenDayStatus[];
  muscleReadinessMap: Record<string, MuscleSevenDayStatus>;
  recommendedSplitName: string;
  recommendedMuscles: string[];
  highImpactLowerCount: number;
  highImpactUpperCount: number;
  promptSummaryBlock: string;
}

function formatRelativeDayLabel(daysAgo: number): string {
  if (daysAgo <= 0) return 'Hoje';
  if (daysAgo === 1) return 'Ontem';
  return `Há ${daysAgo} dias`;
}

function getCalendarDaysAgo(dateStr: string, todayStr: string): number {
  const [dy, dm, dd] = dateStr.split('-').map(Number);
  const [ty, tm, td] = todayStr.split('-').map(Number);
  if (!dy || !dm || !dd || !ty || !tm || !td) return 0;
  const dUtc = Date.UTC(dy, dm - 1, dd);
  const tUtc = Date.UTC(ty, tm - 1, td);
  return Math.max(0, Math.round((tUtc - dUtc) / (24 * 60 * 60 * 1000)));
}

function extractSportMetricSnippet(sportKey: string, metrics: Record<string, any> | undefined): string {
  if (!metrics) return '';

  switch (sportKey) {
    case 'running': {
      const distKm =
        metrics.distanceMeters > 0
          ? metrics.distanceMeters / 1000
          : metrics.distanceKm > 0
            ? Number(metrics.distanceKm)
            : 0;
      const parts: string[] = [];
      if (distKm > 0) parts.push(`${distKm.toFixed(1)} km`);
      if (metrics.runningType && metrics.runningType !== 'other') parts.push(String(metrics.runningType));
      return parts.join(', ');
    }
    case 'cycling': {
      const distKm =
        metrics.distanceKm > 0
          ? Number(metrics.distanceKm)
          : metrics.distanceMeters > 0
            ? metrics.distanceMeters / 1000
            : 0;
      return distKm > 0 ? `${distKm.toFixed(1)} km` : '';
    }
    case 'swimming': {
      const distM = metrics.totalDistanceMeters ?? metrics.distanceMeters ?? 0;
      return distM > 0 ? `${Math.round(Number(distM))} m` : '';
    }
    case 'boxing':
    case 'jiujitsu': {
      const rounds = Number(metrics.roundsCount || 0);
      return rounds > 0 ? `${rounds} rounds` : '';
    }
    case 'futevolei': {
      const sets = Number(metrics.setsCount || 0);
      return sets > 0 ? `${sets} sets` : '';
    }
    case 'football': {
      return metrics.matchType ? String(metrics.matchType).replace('_', ' ') : '';
    }
    default:
      return '';
  }
}

export function buildSevenDayActivityContext(params: {
  strengthSessions: Array<{
    _id?: any;
    startedAt: Date | string;
    finishedAt?: Date | string;
    createdAt?: Date | string;
    durationSeconds?: number;
    rpe?: number;
    totalVolumeKg?: number | null;
    exercises?: Array<{
      exerciseKey: string;
      primaryMuscleGroup?: string;
      sets?: Array<{ status?: string }>;
    }>;
  }>;
  generalSessions: Array<{
    _id?: any;
    sportKey: string;
    startedAt: Date | string;
    endedAt?: Date | string;
    durationSeconds?: number;
    rpe?: number;
    sessionalLoad?: number;
    load?: { srpe?: number } | null;
    metrics?: Record<string, any>;
  }>;
  catalogByKey: Map<string, CatalogExerciseItem>;
  fatigueMap?: {
    regions?: Array<{
      region: string;
      fatigueScore: number;
      recoveryPercent: number;
      status: string;
      sources: string[];
    }>;
  } | null;
  timezone?: string;
  soreRegions?: string[];
  now?: Date;
}): SevenDayActivityContext {
  const now = params.now ?? new Date();
  const nowMs = now.getTime();
  const sevenDaysAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  const tz = resolveValidTimeZone(params.timezone);
  const todayStr = formatDateInTimeZone(now, tz);
  const soreSet = new Set((params.soreRegions ?? []).map((r) => r.toLowerCase()));

  const isMuscleBlockedBySore = (muscleGroup: string) => {
    for (const sore of soreSet) {
      if (sore === muscleGroup) return true;
      if ((SORE_ALIASES[sore] ?? []).includes(muscleGroup)) return true;
    }
    return false;
  };

  const accumulators = new Map<
    string,
    {
      strengthPrimarySets: number;
      strengthSecondarySets: number;
      strengthSessionsCount: number;
      sportImpactSessionsCount: number;
      impactingSports: Set<string>;
      lastStimulatedHoursAgo: number | null;
      computedFatigue: number;
    }
  >();

  for (const group of TRACKED_MUSCLE_GROUPS) {
    accumulators.set(group, {
      strengthPrimarySets: 0,
      strengthSecondarySets: 0,
      strengthSessionsCount: 0,
      sportImpactSessionsCount: 0,
      impactingSports: new Set<string>(),
      lastStimulatedHoursAgo: null,
      computedFatigue: 0,
    });
  }

  const updateRecency = (group: string, hoursAgo: number) => {
    const acc = accumulators.get(group);
    if (!acc) return;
    if (acc.lastStimulatedHoursAgo === null || hoursAgo < acc.lastStimulatedHoursAgo) {
      acc.lastStimulatedHoursAgo = hoursAgo;
    }
  };

  const seenStrengthIds = new Set<string>();
  const activities: SevenDayActivityItem[] = [];
  let strengthSessionsCount = 0;
  let otherSportsSessionsCount = 0;
  let totalDurationMinutes = 0;
  let totalSrpeLoad = 0;
  let highImpactLowerCount = 0;
  let highImpactUpperCount = 0;
  const sportsPracticedSet = new Set<string>();

  // 1. Sessões de musculação dentro da janela de 7 dias
  for (const past of params.strengthSessions || []) {
    const startedDate = new Date(past.startedAt ?? past.finishedAt ?? past.createdAt ?? now);
    const finishedDate = past.finishedAt ? new Date(past.finishedAt) : startedDate;
    const startedMs = startedDate.getTime();
    const finishedMs = finishedDate.getTime();

    if (Number.isNaN(startedMs) && Number.isNaN(finishedMs)) continue;
    const isWithinWindow =
      (!Number.isNaN(startedMs) && startedMs >= sevenDaysAgoMs) ||
      (!Number.isNaN(finishedMs) && finishedMs >= sevenDaysAgoMs);
    if (!isWithinWindow) continue;

    const idStr = past._id ? String(past._id) : undefined;
    if (idStr) seenStrengthIds.add(idStr);

    const refDate = !Number.isNaN(finishedMs) ? finishedDate : startedDate;
    const hoursAgo = Math.max(0, (nowMs - refDate.getTime()) / (60 * 60 * 1000));
    const dateStr = formatDateInTimeZone(startedDate, tz);
    const daysAgo = getCalendarDaysAgo(dateStr, todayStr);
    const decayFactor = applyFatigueDecay(1, hoursAgo);

    const musclesInSession = new Set<string>();
    const sessionPrimaryGroups = new Set<string>();
    const sessionSecondaryGroups = new Set<string>();
    let totalSessionSets = 0;

    for (const ex of past.exercises || []) {
      const cat = params.catalogByKey.get(ex.exerciseKey);
      const primary = cat?.primaryMuscleGroup ?? ex.primaryMuscleGroup ?? 'corpo_inteiro';
      const secondaries = cat?.secondaryMuscleGroups ?? [];

      const completedSets = (ex.sets || []).filter((s) => s.status === 'completed').length;
      const setsCount = completedSets > 0 ? completedSets : (ex.sets || []).length;
      totalSessionSets += setsCount;

      if (primary && primary !== 'corpo_inteiro') {
        musclesInSession.add(primary);
        sessionPrimaryGroups.add(primary);
        const acc = accumulators.get(primary);
        if (acc && setsCount > 0) {
          acc.strengthPrimarySets += setsCount;
          acc.computedFatigue += setsCount * 12 * decayFactor;
          updateRecency(primary, hoursAgo);
        }
      }

      for (const sec of secondaries) {
        if (!sec || sec === primary) continue;
        sessionSecondaryGroups.add(sec);
        const acc = accumulators.get(sec);
        if (acc && setsCount > 0) {
          acc.strengthSecondarySets += setsCount;
          acc.computedFatigue += setsCount * 5 * decayFactor;
          updateRecency(sec, hoursAgo);
        }
      }
    }

    for (const group of new Set([...sessionPrimaryGroups, ...sessionSecondaryGroups])) {
      const acc = accumulators.get(group);
      if (acc) acc.strengthSessionsCount += 1;
    }

    const durationMinutes = past.durationSeconds
      ? Math.max(1, Math.round(past.durationSeconds / 60))
      : Math.max(20, (past.exercises?.length ?? 1) * 8);
    const srpe =
      past.rpe && durationMinutes > 0 ? Math.round(past.rpe * durationMinutes) : undefined;

    strengthSessionsCount += 1;
    totalDurationMinutes += durationMinutes;
    if (srpe) totalSrpeLoad += srpe;
    sportsPracticedSet.add('Musculação');

    const musclesLabel =
      Array.from(musclesInSession)
        .map((m) => MUSCLE_LABELS_PT[m] || m)
        .join(', ') || 'Geral';

    const metaParts = [
      `${(past.exercises || []).length} exercícios`,
      `${totalSessionSets} séries`,
      `${durationMinutes} min`,
      ...(past.rpe ? [`RPE ${past.rpe}`] : []),
      ...(srpe ? [`carga ${srpe} UA`] : []),
    ];

    activities.push({
      id: idStr,
      sportKey: 'strength',
      sportLabel: 'Musculação',
      dateStr,
      daysAgo,
      hoursAgo,
      durationMinutes,
      rpe: past.rpe,
      srpe,
      musclesHit: Array.from(musclesInSession),
      summaryLine: `${formatRelativeDayLabel(daysAgo)} (${dateStr}): Musculação — ${musclesLabel} (${metaParts.join(', ')})`,
    });
  }

  // 2. Todas as outras modalidades (SessionModel) na janela de 7 dias
  for (const session of params.generalSessions || []) {
    const idStr = session._id ? String(session._id) : undefined;
    if (session.sportKey === 'strength' && idStr && seenStrengthIds.has(idStr)) {
      continue; // já contabilizado via ActiveStrengthSessionModel detalhado
    }

    const startedDate = new Date(session.startedAt);
    const endedDate = session.endedAt ? new Date(session.endedAt) : startedDate;
    if (Number.isNaN(startedDate.getTime())) continue;

    const isWithinWindow =
      startedDate.getTime() >= sevenDaysAgoMs ||
      (!Number.isNaN(endedDate.getTime()) && endedDate.getTime() >= sevenDaysAgoMs);
    if (!isWithinWindow) continue;

    const refDate = !Number.isNaN(endedDate.getTime()) ? endedDate : startedDate;
    const hoursAgo = Math.max(0, (nowMs - refDate.getTime()) / (60 * 60 * 1000));
    const dateStr = formatDateInTimeZone(startedDate, tz);
    const daysAgo = getCalendarDaysAgo(dateStr, todayStr);
    const decayFactor = applyFatigueDecay(1, hoursAgo);

    const durationMinutes = Math.max(
      1,
      Math.round((session.durationSeconds || session.metrics?.durationSeconds || 0) / 60)
    );
    const srpe =
      session.load?.srpe ??
      session.sessionalLoad ??
      (session.rpe && durationMinutes > 0 ? Math.round(session.rpe * durationMinutes) : 0);

    const sportLabel = SPORT_LABELS_PT[session.sportKey] || session.sportKey;
    sportsPracticedSet.add(sportLabel);
    totalDurationMinutes += durationMinutes;
    totalSrpeLoad += srpe;

    if (session.sportKey === 'strength') {
      strengthSessionsCount += 1;
      const legacyMuscles = new Set<string>();
      for (const ex of session.metrics?.exercises || []) {
        if (ex?.targetMuscleGroup) legacyMuscles.add(String(ex.targetMuscleGroup));
      }
      const musclesArr = Array.from(legacyMuscles);
      for (const m of musclesArr) {
        const acc = accumulators.get(m);
        if (acc) {
          acc.strengthSessionsCount += 1;
          acc.strengthPrimarySets += 4;
          acc.computedFatigue += 30 * decayFactor;
          updateRecency(m, hoursAgo);
        }
      }
      activities.push({
        id: idStr,
        sportKey: 'strength',
        sportLabel,
        dateStr,
        daysAgo,
        hoursAgo,
        durationMinutes,
        rpe: session.rpe,
        srpe,
        musclesHit: musclesArr,
        summaryLine: `${formatRelativeDayLabel(daysAgo)} (${dateStr}): Musculação — ${musclesArr.join(', ') || 'Geral'} (${durationMinutes} min${session.rpe ? `, RPE ${session.rpe}` : ''}${srpe ? `, carga ${srpe} UA` : ''})`,
      });
      continue;
    }

    otherSportsSessionsCount += 1;
    if (LOWER_BODY_IMPACT_SPORTS.has(session.sportKey)) highImpactLowerCount += 1;
    if (UPPER_IMPACT_SPORTS.has(session.sportKey)) highImpactUpperCount += 1;

    const impactedRegions = SPORT_MUSCLE_IMPACT[session.sportKey] ?? [];
    const hitGroups = new Set<string>();
    const baseImpactPoints = Math.max(
      8,
      srpe > 0 ? srpe / 10 : Math.max(15, durationMinutes) * 0.55
    );

    for (const region of impactedRegions) {
      const targets = SPORT_REGION_TO_MUSCLE_GROUPS[region] ?? [];
      for (const target of targets) {
        const acc = accumulators.get(target.group);
        if (!acc) continue;
        if (!hitGroups.has(target.group)) {
          acc.sportImpactSessionsCount += 1;
          hitGroups.add(target.group);
        }
        acc.impactingSports.add(sportLabel);
        acc.computedFatigue += baseImpactPoints * target.weight * decayFactor;
        updateRecency(target.group, hoursAgo);
      }
    }

    const snippet = extractSportMetricSnippet(session.sportKey, session.metrics);
    const metaParts = [
      `${durationMinutes} min`,
      ...(session.rpe ? [`RPE ${session.rpe}`] : []),
      ...(srpe > 0 ? [`carga ${srpe} UA`] : []),
    ];

    activities.push({
      id: idStr,
      sportKey: session.sportKey,
      sportLabel,
      dateStr,
      daysAgo,
      hoursAgo,
      durationMinutes,
      rpe: session.rpe,
      srpe,
      musclesHit: Array.from(hitGroups),
      summaryLine: `${formatRelativeDayLabel(daysAgo)} (${dateStr}): ${sportLabel}${snippet ? ` (${snippet})` : ''} — ${metaParts.join(', ')}${impactedRegions.length > 0 ? ` | Impacto: ${impactedRegions.join(', ')}` : ''}`,
    });
  }

  activities.sort((a, b) => a.hoursAgo - b.hoursAgo);

  // 3. Combinar fadiga calculada + mapa de fadiga 72h do ProgressService (se disponível)
  const fatigueByRegion = new Map<string, number>();
  for (const r of params.fatigueMap?.regions || []) {
    fatigueByRegion.set(r.region, r.fatigueScore);
  }

  const muscleStatuses: MuscleSevenDayStatus[] = TRACKED_MUSCLE_GROUPS.map((muscleGroup) => {
    const acc = accumulators.get(muscleGroup)!;
    const mapFatigue = fatigueByRegion.get(muscleGroup) ?? 0;
    const fatigueScore = Math.min(
      100,
      Math.round(Math.max(acc.computedFatigue, mapFatigue))
    );

    let score = 100;
    if (acc.lastStimulatedHoursAgo !== null) {
      if (acc.lastStimulatedHoursAgo <= 24) score -= 65;
      else if (acc.lastStimulatedHoursAgo <= 48) score -= 45;
      else if (acc.lastStimulatedHoursAgo <= 72) score -= 20;
      else if (acc.lastStimulatedHoursAgo <= 96) score -= 8;
    } else {
      score += 25;
    }

    score -= fatigueScore * 0.6;

    const effectiveWeeklySets = acc.strengthPrimarySets + acc.strengthSecondarySets * 0.5;
    if (effectiveWeeklySets === 0 && acc.sportImpactSessionsCount === 0) {
      score += 15;
    } else if (effectiveWeeklySets < 6) {
      score += 6;
    } else if (effectiveWeeklySets >= 12) {
      score -= 20;
    } else if (effectiveWeeklySets >= 8) {
      score -= 10;
    }

    if (acc.sportImpactSessionsCount >= 2) {
      score -= Math.min(15, acc.sportImpactSessionsCount * 5);
    }

    if (isMuscleBlockedBySore(muscleGroup)) {
      score -= 200;
    }

    return {
      muscleGroup,
      strengthPrimarySets: acc.strengthPrimarySets,
      strengthSecondarySets: acc.strengthSecondarySets,
      strengthSessionsCount: acc.strengthSessionsCount,
      sportImpactSessionsCount: acc.sportImpactSessionsCount,
      impactingSports: Array.from(acc.impactingSports),
      lastStimulatedHoursAgo:
        acc.lastStimulatedHoursAgo !== null ? Math.round(acc.lastStimulatedHoursAgo) : null,
      fatigueScore,
      recoveryReadinessScore: Math.round(score),
    };
  });

  const muscleReadinessMap: Record<string, MuscleSevenDayStatus> = {};
  for (const status of muscleStatuses) {
    muscleReadinessMap[status.muscleGroup] = status;
  }

  // 4. Determinar melhor divisão complementar para hoje com base nos últimos 7 dias
  let bestSplit = COMPLEMENTARY_SPLITS[0];
  let bestSplitScore = -Infinity;
  let bestSplitMuscles: string[] = [];

  for (const split of COMPLEMENTARY_SPLITS) {
    const allowedMuscles = split.muscles.filter((m) => !isMuscleBlockedBySore(m));
    if (allowedMuscles.length === 0) continue;

    const scores = allowedMuscles.map(
      (m) => muscleReadinessMap[m]?.recoveryReadinessScore ?? 100
    );
    const avgScore = scores.reduce((sum, v) => sum + v, 0) / scores.length;

    // Pequeno desempate favorável a splits mais específicos (Push/Pull/Legs) sobre Upper Body genérico
    const specificityBonus = split.muscles.length <= 4 ? 2 : 0;
    const totalSplitScore = avgScore + specificityBonus;

    if (totalSplitScore > bestSplitScore) {
      bestSplitScore = totalSplitScore;
      bestSplit = split;
      bestSplitMuscles = [...allowedMuscles].sort(
        (a, b) =>
          (muscleReadinessMap[b]?.recoveryReadinessScore ?? 0) -
          (muscleReadinessMap[a]?.recoveryReadinessScore ?? 0)
      );
    }
  }

  if (bestSplitMuscles.length === 0) {
    bestSplitMuscles = muscleStatuses
      .filter((m) => !isMuscleBlockedBySore(m.muscleGroup))
      .sort((a, b) => b.recoveryReadinessScore - a.recoveryReadinessScore)
      .slice(0, 3)
      .map((m) => m.muscleGroup);
  }

  const activityLines = activities.map((a) => `- ${a.summaryLine}`);
  const fatiguedMuscles = muscleStatuses
    .filter((m) => m.fatigueScore >= 25 || (m.lastStimulatedHoursAgo !== null && m.lastStimulatedHoursAgo <= 48))
    .sort((a, b) => a.recoveryReadinessScore - b.recoveryReadinessScore)
    .map((m) => {
      const reasons: string[] = [];
      if (m.lastStimulatedHoursAgo !== null) reasons.push(`há ${m.lastStimulatedHoursAgo}h`);
      if (m.strengthPrimarySets > 0) reasons.push(`${m.strengthPrimarySets} séries na semana`);
      if (m.impactingSports.length > 0) reasons.push(`impacto de ${m.impactingSports.join('/')}`);
      return `${MUSCLE_LABELS_PT[m.muscleGroup] || m.muscleGroup} (${reasons.join(', ')})`;
    });

  const freshMuscles = muscleStatuses
    .filter((m) => !isMuscleBlockedBySore(m.muscleGroup) && m.recoveryReadinessScore >= 85)
    .sort((a, b) => b.recoveryReadinessScore - a.recoveryReadinessScore)
    .map((m) => {
      const setsInfo =
        m.strengthPrimarySets > 0
          ? `${m.strengthPrimarySets} séries/7d`
          : '0 séries/7d';
      const recency =
        m.lastStimulatedHoursAgo === null ? 'descansado nos 7d' : `último há ${m.lastStimulatedHoursAgo}h`;
      return `${MUSCLE_LABELS_PT[m.muscleGroup] || m.muscleGroup} (${setsInfo}, ${recency})`;
    });

  const volumeByMuscleLine = muscleStatuses
    .filter((m) => m.strengthPrimarySets > 0 || m.sportImpactSessionsCount > 0)
    .map(
      (m) =>
        `${MUSCLE_LABELS_PT[m.muscleGroup] || m.muscleGroup}: ${m.strengthPrimarySets} séries dir.${m.strengthSecondarySets > 0 ? ` + ${m.strengthSecondarySets} sec.` : ''}${m.impactingSports.length > 0 ? ` + impacto (${m.impactingSports.join(', ')})` : ''}`
    )
    .join(' | ');

  const promptSummaryBlock =
    activities.length > 0
      ? [
          `- Resumo da janela (últimos 7 dias): ${activities.length} atividade(s) (${strengthSessionsCount} musculação, ${otherSportsSessionsCount} outros esportes), ${totalDurationMinutes} min totais, carga sRPE acumulada ${totalSrpeLoad} UA.`,
          `- Modalidades praticadas nos últimos 7 dias: ${Array.from(sportsPracticedSet).join(', ')}.`,
          `- Balanço semanal de estímulo por grupo muscular: ${volumeByMuscleLine || 'Sem estímulo muscular registrado na janela.'}`,
          `- Grupamentos com fadiga ou estímulo recente (24–48h): ${fatiguedMuscles.length > 0 ? fatiguedMuscles.join('; ') : 'Nenhum grupo sobrecarregado recentemente.'}`,
          `- Grupamentos mais recuperados / prioritários nos últimos 7 dias: ${freshMuscles.length > 0 ? freshMuscles.join('; ') : 'Equilibrados.'}`,
          `- Sugestão complementar calculada pelos últimos 7 dias: ${bestSplit.name}`,
        ].join('\n')
      : '- Resumo da janela (últimos 7 dias): Nenhuma atividade registrada nos últimos 7 dias (todos os grupamentos recuperados).';

  return {
    windowStartIso: new Date(sevenDaysAgoMs).toISOString(),
    totalSessions: activities.length,
    strengthSessionsCount,
    otherSportsSessionsCount,
    totalDurationMinutes,
    totalSrpeLoad,
    sportsPracticed: Array.from(sportsPracticedSet),
    activities,
    activityLines,
    muscleStatuses,
    muscleReadinessMap,
    recommendedSplitName: bestSplit.name,
    recommendedMuscles: bestSplitMuscles,
    highImpactLowerCount,
    highImpactUpperCount,
    promptSummaryBlock,
  };
}

export function selectExercisesBalanced(params: {
  candidateExercises: CatalogExerciseItem[];
  targetMuscles: string[];
  targetCount: number;
}): CatalogExerciseItem[] {
  const { candidateExercises, targetMuscles, targetCount } = params;
  if (candidateExercises.length === 0 || targetCount <= 0) return [];

  const sortedPool = [...candidateExercises].sort((a, b) => {
    if (a.type === 'compound' && b.type !== 'compound') return -1;
    if (a.type !== 'compound' && b.type === 'compound') return 1;
    return 0;
  });

  if (targetMuscles.length === 0) {
    return sortedPool.slice(0, targetCount);
  }

  const byMuscle = new Map<string, CatalogExerciseItem[]>();
  for (const muscle of targetMuscles) {
    byMuscle.set(
      muscle,
      sortedPool.filter((ex) => ex.primaryMuscleGroup === muscle)
    );
  }

  const picked: CatalogExerciseItem[] = [];
  const pickedKeys = new Set<string>();
  let addedInRound = true;

  while (picked.length < targetCount && addedInRound) {
    addedInRound = false;
    for (const muscle of targetMuscles) {
      if (picked.length >= targetCount) break;
      const bucket = byMuscle.get(muscle);
      if (!bucket || bucket.length === 0) continue;
      while (bucket.length > 0) {
        const next = bucket.shift()!;
        if (!pickedKeys.has(next.key)) {
          picked.push(next);
          pickedKeys.add(next.key);
          addedInRound = true;
          break;
        }
      }
    }
  }

  if (picked.length < targetCount) {
    for (const ex of sortedPool) {
      if (picked.length >= targetCount) break;
      if (!pickedKeys.has(ex.key)) {
        picked.push(ex);
        pickedKeys.add(ex.key);
      }
    }
  }

  // Compostos sempre no início, preservando ordem balanceada dentro de cada categoria
  return picked.sort((a, b) => {
    const aComp = a.type === 'compound' ? 0 : 1;
    const bComp = b.type === 'compound' ? 0 : 1;
    return aComp - bComp;
  });
}

function normalizeText(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const SUBREGION_KEY_HINTS: Array<{ match: RegExp; keyTokens: string[] }> = [
  { match: /clavicular|peitoral superior|feixe superior/, keyTokens: ['inclinado', 'polia_baixa'] },
  { match: /peitoral inferior|declinado/, keyTokens: ['declinado', 'polia_alta', 'paralelas'] },
  { match: /deltoide posterior|posterior do ombro/, keyTokens: ['invertido', 'face_pull'] },
  { match: /deltoide lateral|acromial|caping|ombro lateral/, keyTokens: ['elevacao_lateral'] },
  { match: /deltoide anterior/, keyTokens: ['desenvolvimento', 'frontal'] },
  { match: /cabeca longa.*triceps|ferradura/, keyTokens: ['frances', 'testa'] },
  { match: /largura.*dorsal|v-taper|insercao baixa/, keyTokens: ['puxada', 'barra_fixa', 'pulldown'] },
  { match: /espessura|trapezio|romboide|miolo/, keyTokens: ['remada', 'encolhimento'] },
  { match: /pico.*biceps|inclinada/, keyTokens: ['inclinada', 'concentrada', 'scott'] },
  { match: /martelo|braquial|antebraco/, keyTokens: ['martelo', 'inversa'] },
  { match: /vasto medial|reto femoral|distal/, keyTokens: ['extensora', 'frontal', 'agachamento'] },
  { match: /soleo/, keyTokens: ['sentado'] },
  { match: /gastrocnemio|em pe/, keyTokens: ['em_pe', 'leg_press'] },
  { match: /vacuum|cintura|obliquo/, keyTokens: ['vacuum', 'infra', 'prancha_lateral'] },
  { match: /infra.*abdom|linha media/, keyTokens: ['crunch', 'infra', 'ab_wheel'] },
  { match: /biceps femoral|isquiotibiais|posterior/, keyTokens: ['stiff', 'rdl', 'mesa_flexora'] },
];

function scoreSubRegionMatch(exerciseKey: string, exerciseName: string, subRegion?: string): number {
  if (!subRegion) return 0;
  const subNorm = normalizeText(subRegion);
  const targetNorm = `${normalizeText(exerciseKey)} ${normalizeText(exerciseName)}`;
  let score = 0;

  for (const hint of SUBREGION_KEY_HINTS) {
    if (hint.match.test(subNorm)) {
      for (const token of hint.keyTokens) {
        if (targetNorm.includes(token)) {
          score += 3;
        }
      }
    }
  }

  for (const word of subNorm.split(/[\s,/()-]+/)) {
    if (word.length >= 4 && targetNorm.includes(word)) {
      score += 1;
    }
  }

  return score;
}

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
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Buscar catálogo, sessões de musculação (para ghost loads e 7d), todas as atividades dos últimos 7 dias, prontidão e fuso
    const [
      dbExercises,
      recentStrengthSessions,
      lastSevenDaysSessions,
      latestReadiness,
      userSettings,
      fatigueMap,
    ] = await Promise.all([
      ExerciseModel.find({
        isActive: true,
        $or: [{ isSystem: true }, { ownerId: userId }],
      }).lean(),
      ActiveStrengthSessionModel.find({
        userId,
        status: 'completed',
      })
        .sort({ startedAt: -1 })
        .limit(20)
        .lean(),
      SessionModel.find({
        userId,
        status: 'completed',
        startedAt: { $gte: sevenDaysAgo },
      })
        .sort({ startedAt: -1 })
        .lean(),
      DailyReadinessModel.findOne({ userId })
        .sort({ dateKey: -1 })
        .lean()
        .catch(() => null),
      UserSettingsModel.findOne({ userId })
        .select('timezone')
        .lean()
        .catch(() => null),
      progressService.getMuscleFatigueMap(userId).catch(() => null),
    ]);

    const catalog: CatalogExerciseItem[] =
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

    // 2. Extrair cargas de referência (ghost values — preserva histórico mesmo > 7 dias)
    const latestCompletedSetsByExercise = new Map<string, any[]>();
    for (const past of recentStrengthSessions) {
      for (const ex of past.exercises || []) {
        if (!latestCompletedSetsByExercise.has(ex.exerciseKey)) {
          const completedSets = (ex.sets || []).filter((s) => s.status === 'completed');
          if (completedSets.length > 0) {
            latestCompletedSetsByExercise.set(ex.exerciseKey, completedSets);
          }
        }
      }
    }

    // 3. Filtrar catálogo candidato e montar contexto completo das atividades dos últimos 7 dias
    const requestedMuscles = (input.muscleGroups || []).filter(Boolean);
    const requestedEquipment = (input.equipment || []).filter(Boolean);
    const soreRegions = (input.soreRegions ?? latestReadiness?.soreRegions ?? []).map((region) =>
      region.toLowerCase()
    );

    const sevenDayContext = buildSevenDayActivityContext({
      strengthSessions: recentStrengthSessions,
      generalSessions: lastSevenDaysSessions,
      catalogByKey,
      fatigueMap,
      timezone: userSettings?.timezone,
      soreRegions,
      now,
    });

    const exerciseOverloadsSoreRegion = (exercise: {
      primaryMuscleGroup: string;
      secondaryMuscleGroups?: string[];
    }) => {
      const exerciseGroups = [
        exercise.primaryMuscleGroup,
        ...(exercise.secondaryMuscleGroups ?? []),
      ];
      return soreRegions.some((region) =>
        [region, ...(SORE_ALIASES[region] ?? [])].some((blocked) =>
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
- ANALISE TODAS AS ATIVIDADES DOS ÚLTIMOS 7 DIAS (musculação E outros esportes como corrida, ciclismo, futebol, futevôlei, boxe, jiu-jitsu, natação) — NÃO olhe apenas o último treino de musculação.
- Avalie o volume semanal acumulado por grupamento, o tempo de recuperação desde o último estímulo (24–72h) e o impacto cruzado dos outros esportes (ex.: corrida/futebol/futevôlei/ciclismo geram fadiga em quadríceps, posteriores, panturrilhas e joelhos; boxe/jiu-jitsu/natação exigem ombros, costas, pegada e core).
- Se o atleta não especificou grupamentos musculares nem pedido livre, escolha uma divisão complementar lógica priorizando grupamentos recuperados e sub-estimulados na janela dos últimos 7 dias, evitando sobrecarregar musculaturas altamente exigidas nas últimas 24–48h.
- Mesmo quando o atleta escolher grupamentos específicos, calibre o volume e a seleção de exercícios considerando a carga multiesportiva dos últimos 7 dias.
- Nunca selecione exercícios cujo grupo primário ou secundário sobrecarregue as regiões protegidas por dor: ${soreRegions.join(', ') || 'nenhuma'}.

PARÂMETROS DO ATLETA:
- Pedido livre / foco específico: ${input.prompt?.trim() ? `"${input.prompt.trim()}"` : 'Nenhum pedido específico'}
- Grupamentos selecionados: ${requestedMuscles.length > 0 ? requestedMuscles.join(', ') : `Sugerir com base na análise completa dos últimos 7 dias (sugestão complementar: ${sevenDayContext.recommendedSplitName})`}
- Equipamentos preferidos: ${requestedEquipment.length > 0 ? requestedEquipment.join(', ') : 'Qualquer equipamento da academia'}
- Duração alvo: ${durationMinutes} minutos
- Objetivo principal: ${goal}
- Prontidão Diária (Check-in): ${readinessContext}
${sevenDayContext.promptSummaryBlock}
- Atividades registradas nos últimos 7 dias (todas as modalidades, da mais recente para a mais antiga):
${sevenDayContext.activityLines.length > 0 ? sevenDayContext.activityLines.join('\n') : 'Nenhuma atividade registrada nos últimos 7 dias.'}

CATÁLOGO DISPONÍVEL (use apenas estas chaves em \`exerciseKey\`):
${catalogListText}

Retorne APENAS um JSON válido com a estrutura:
{
  "name": "Nome curto e forte para a ficha (ex: Push A - Peito, Ombros e Tríceps)",
  "description": "Resumo de 1 linha do foco do treino",
  "rationale": "Explicação direta do IA Personal (2 a 3 frases) citando o que foi observado nas atividades dos últimos 7 dias (musculação e demais modalidades), a prontidão e o motivo da escolha dos exercícios.",
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

    // 5. Fallback determinístico caso a API falhe (também orientado pelos últimos 7 dias)
    return this.buildDeterministicFallback(
      { ...input, readinessScore, muscleRecovery },
      candidateExercises,
      catalogByKey,
      latestCompletedSetsByExercise,
      sevenDayContext
    );
  }

  /**
   * Gera ou adapta fichas corretivas focadas nos pontos fracos (e sub-regiões anatômicas)
   * identificados pela Avaliação Física por IA, respeitando os dias disponíveis de musculação
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
      availableStrengthDays <= 2 ? Math.min(2, availableStrengthDays) : 3;

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
            `- ${w.muscleGroup} (sub-região: ${w.subRegion}, prioridade: ${w.priority}, poses: ${(w.detectedInPoses || []).join(', ') || 'gerais'}, meta semanal: ${w.targetWeeklySets} séries, motivo: ${w.technicalReason}, sugestões: ${w.recommendedExerciseNames.join(', ')})`
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
Sua missão é ${mode === 'adapt_existing' ? 'adaptar as fichas do atleta ou criar' : 'criar'} de 1 a ${maxRoutines} fichas semanais corretivas com base na Avaliação Física de Poses por IA.

REGRAS OBRIGATÓRIAS:
- Posicione os exercícios das SUB-REGIÕES DEFICITÁRIAS (prioridade high primeiro) SEMPRE NO INÍCIO de cada ficha (primeiros índices), quando o atleta está com energia máxima.
- Cruze cada 'subRegion' (ex: peitoral superior -> supino inclinado; deltoide posterior -> crucifixo invertido / face pull; cabeça longa do tríceps -> tríceps francês / testa) com as chaves exatas do CATÁLOGO DISPONÍVEL.
- Ajuste a quantidade de séries ('setsCount') e frequência nas fichas para atingir ou aproximar o 'targetWeeklySets' de cada ponto fraco respeitando os ${availableStrengthDays} dia(s)/semana disponíveis.
- Use EXCLUSIVAMENTE chaves 'exerciseKey' do CATÁLOGO DISPONÍVEL abaixo.
- Objetivo / Categoria do atleta: ${assessment.goal}
- Divisão sugerida pela avaliação: ${assessment.result.recommendedSplit}

${multisportContext}

PONTOS FRACOS IDENTIFICADOS (COM SUB-REGIÃO):
${weakPointsText}

CATÁLOGO DISPONÍVEL:
${catalogListText}

Retorne APENAS um JSON válido no formato:
{
  "summary": "Resumo curto explicando como as fichas priorizam as sub-regiões deficitárias no início, os ${availableStrengthDays} dias disponíveis e proteção multiesportiva",
  "routines": [
    {
      "name": "Nome da ficha (ex: Correção A — Peitoral Superior & Deltoides)",
      "description": "Descrição curta do foco corretivo",
      "exercises": [
        {
          "exerciseKey": "chave_exata_do_catalogo",
          "setsCount": 4,
          "targetReps": 10,
          "restSeconds": 90,
          "notes": "Foco na sub-região deficitária"
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

    const targetReps = goal === 'definition' ? 12 : 10;
    const restSeconds = goal === 'bodybuilding' || goal === 'classic_physique' ? 90 : 90;

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
            const aSub = scoreSubRegionMatch(a.key, a.name, wp.subRegion);
            const bSub = scoreSubRegionMatch(b.key, b.name, wp.subRegion);
            if (aSub !== bSub) return bSub - aSub;

            const aRec = wp.recommendedExerciseNames.some((n) =>
              normalizeText(a.name).includes(normalizeText(n).split(' ')[0])
            )
              ? 1
              : 0;
            const bRec = wp.recommendedExerciseNames.some((n) =>
              normalizeText(b.name).includes(normalizeText(n).split(' ')[0])
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
            notes: `Foco ${wp.subRegion} (${wp.priority === 'high' ? 'ALTA' : 'MÉDIA'}, ${effectiveWeeklyTarget} séries/sem): ${wp.technicalReason.slice(0, 90)}`,
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

    const freqPerSplit =
      context.availableStrengthDays >= 4
        ? 2
        : Math.max(1, Math.min(2, context.availableStrengthDays));

    if (context.availableStrengthDays === 1) {
      const allEx = buildExercisesForGroup(weakPoints, 1);
      routines.push({
        name: `Correção IA Full Body (${weakPoints.slice(0, 2).map((w) => w.muscleGroup).join('/')})`.slice(0, 80),
        description: `Ficha única 1x/semana priorizando sub-regiões deficitárias dentro da disponibilidade semanal.`,
        exercises: allEx.slice(0, 7),
      });
    } else if (upperWeak.length > 0 && lowerWeak.length > 0) {
      const upperEx = buildExercisesForGroup(upperWeak, freqPerSplit);
      const lowerEx = buildExercisesForGroup(
        lowerWeak,
        context.limitLowerAndLumbarVolume ? 1 : freqPerSplit
      );
      const upperRoutine =
        upperEx.length > 0
          ? {
              name: `Foco Pontos Fracos — Superiores (${upperWeak.map((w) => w.muscleGroup).join('/')})`.slice(0, 80),
              description: `Ficha corretiva ajustada para ${context.availableStrengthDays} dias/sem com superiores deficitários no início.`,
              exercises: upperEx.slice(0, 8),
            }
          : null;
      const lowerRoutine =
        lowerEx.length > 0
          ? {
              name: `Foco Pontos Fracos — Inferiores (${lowerWeak.map((w) => w.muscleGroup).join('/')})`.slice(0, 80),
              description: context.limitLowerAndLumbarVolume
                ? 'Ficha corretiva com volume moderado para preservar recuperação nos outros esportes.'
                : 'Ficha corretiva com grupamentos deficitários inferiores no início da sessão.',
              exercises: lowerEx.slice(0, 8),
            }
          : null;
      const topIsLower =
        weakPoints[0] && LOWER_BODY_MUSCLE_GROUPS.has(weakPoints[0].muscleGroup);
      const ordered = topIsLower
        ? [lowerRoutine, upperRoutine]
        : [upperRoutine, lowerRoutine];
      for (const item of ordered) {
        if (item) routines.push(item);
      }
    } else {
      const allEx = buildExercisesForGroup(weakPoints, freqPerSplit);
      if (allEx.length < 4) {
        const used = new Set(allEx.map((e) => e.exerciseKey));
        for (const c of catalog
          .filter(
            (x) =>
              x.type === 'compound' &&
              !used.has(x.key) &&
              (!context.limitLowerAndLumbarVolume ||
                !LOWER_BODY_MUSCLE_GROUPS.has(x.primaryMuscleGroup))
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
      summary: `${actionVerb} ${routines.length} ficha(s) para ${context.availableStrengthDays} dia(s)/semana posicionando ${weakPoints.map((w) => w.subRegion || w.muscleGroup).join(', ')} no início dos treinos.${multisportNote}`,
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
    candidateExercises: CatalogExerciseItem[],
    catalogByKey: Map<string, CatalogExerciseItem>,
    latestCompletedSetsByExercise: Map<string, any[]>,
    sevenDayContext?: SevenDayActivityContext
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

    const requestedMuscles = (input.muscleGroups || []).filter(Boolean);
    const targetMuscles =
      requestedMuscles.length > 0
        ? requestedMuscles
        : sevenDayContext?.recommendedMuscles ?? [];

    const picked = selectExercisesBalanced({
      candidateExercises,
      targetMuscles,
      targetCount,
    });

    const selected = picked.map((c) => ({
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
      requestedMuscles.length > 0
        ? requestedMuscles.map((m) => m.toUpperCase()).join(' + ')
        : sevenDayContext?.recommendedSplitName || 'FULL BODY / ESTRUTURADO';

    const historyRationale =
      sevenDayContext && sevenDayContext.totalSessions > 0
        ? `Com base nas suas ${sevenDayContext.totalSessions} atividade(s) dos últimos 7 dias (${sevenDayContext.sportsPracticed.join(', ')}), priorizamos os grupamentos mais recuperados para hoje.`
        : 'Sem atividades registradas nos últimos 7 dias — selecionamos uma estrutura equilibrada com base multiarticular.';

    return {
      name: `Treino IA — ${musclesLabel}`.slice(0, 80),
      description: `Sessão estruturada para ${duration} min com foco em ${
        goal === 'strength'
          ? 'força pura'
          : goal === 'endurance'
            ? 'resistência muscular'
            : 'hipertrofia'
      }.`,
      rationale: `${historyRationale} Organizamos ${exercises.length} exercícios começando pelos multiarticulares de maior recrutamento seguidos de isoladores para a janela de ${duration} minutos.`,
      exercises,
      modelUsed: 'deterministic-fallback',
    };
  }
}

export const strengthAIService = new StrengthAIService();
