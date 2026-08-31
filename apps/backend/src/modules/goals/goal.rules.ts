import type {
  SportKey,
  GoalDTO,
  GoalStatus,
  GoalScope,
  GoalMetricType,
  GoalDirection,
  GoalPeriod,
} from '@pacelog/shared';
import type { IGoalDocument } from './goal.model.js';

export interface ContributingSessionItem {
  id: string;
  startedAt: string;
  sportKey: SportKey;
  value: number;
  unit: string;
}

export interface GoalProgressResult {
  currentValue: number;
  progressPercent: number;
  isAchieved: boolean;
  daysRemaining?: number;
  requiredPacePerWeek?: string;
  contributingSessions: ContributingSessionItem[];
}

export interface SessionDataForGoal {
  _id?: any;
  id?: string;
  startedAt: Date | string;
  sportKey: SportKey;
  durationSeconds?: number;
  metrics?: Record<string, any>;
}

/**
 * Determina a data de início da janela de avaliação da meta com base no período.
 * REGRA MANDATÓRIA: A contagem NUNCA deve incluir atividades realizadas antes da criação/início da meta (startDate).
 */
export function resolveGoalTimeWindow(
  period?: GoalPeriod,
  startDate?: Date | string,
  now = new Date()
): Date {
  const start = startDate instanceof Date ? startDate : startDate ? new Date(startDate) : new Date();

  // Se o período for semanal/mensal rolante, a janela é no máximo os últimos 7/30 dias,
  // mas NUNCA pode ser anterior à data de criação/início da meta (start).
  if (period === 'weekly') {
    const rollingStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return rollingStart > start ? rollingStart : start;
  }

  if (period === 'monthly') {
    const rollingStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return rollingStart > start ? rollingStart : start;
  }

  return start;
}


/**
 * Extrai o volume de uma sessão (retrocompatibilidade).
 */
export function extractSessionVolume(session: SessionDataForGoal): number {
  const { sportKey, metrics = {}, durationSeconds = 0 } = session;
  if (sportKey === 'running' && metrics.distanceMeters) {
    return Math.round((metrics.distanceMeters / 1000) * 100) / 100;
  }
  if (sportKey === 'cycling' && metrics.distanceKm !== undefined) {
    return Number(metrics.distanceKm) || 0;
  }
  if (sportKey === 'strength' && metrics.totalVolumeKg) {
    return Number(metrics.totalVolumeKg);
  }
  if (sportKey === 'boxing' && metrics.roundsCount) {
    return Number(metrics.roundsCount);
  }
  if (sportKey === 'jiujitsu' && metrics.roundsCount) {
    return Number(metrics.roundsCount);
  }
  return Math.round(durationSeconds / 60);
}


/**
 * Extrai o valor de contribuição de uma sessão conforme a métrica alvo.
 */
export function extractSessionMetricValue(
  session: SessionDataForGoal,
  metricType: GoalMetricType
): number {
  const { sportKey, metrics = {}, durationSeconds = 0 } = session;

  switch (metricType) {
    case 'distance_km': {
      if (sportKey === 'running' && metrics.distanceMeters) {
        return Math.round((metrics.distanceMeters / 1000) * 100) / 100;
      }
      if (metrics.distanceKm !== undefined) {
        return Number(metrics.distanceKm) || 0;
      }
      if (sportKey === 'swimming' && metrics.distanceMeters) {
        return Math.round((metrics.distanceMeters / 1000) * 100) / 100;
      }
      return 0;
    }

    case 'duration_minutes':
      return Math.round(durationSeconds / 60);

    case 'sessions_count':
      return 1;

    case 'rounds_count':
      return Number(metrics.roundsCount || metrics.setsCount || 0);

    case 'volume_kg':
      return Number(metrics.totalVolumeKg || 0);

    case 'weight_kg':
      return Number(metrics.weightKg || metrics.maxWeightKg || metrics.loadKg || 0);

    case 'average_speed_kmh':
      return Number(metrics.averageSpeedKmh || metrics.speedKmh || 0);

    case 'average_pace_seconds_per_km':
      return Number(metrics.paceSecondsPerKm || 0);

    case 'streak_days':
      return 1;

    default:
      return 1;
  }
}

/**
 * Retorna a unidade padrão formatada para cada tipo de métrica.
 */
export function getDefaultUnitForMetric(metricType: GoalMetricType, sportKey?: SportKey | null): string {
  switch (metricType) {
    case 'distance_km':
      return 'km';
    case 'duration_minutes':
      return 'min';
    case 'sessions_count':
      return 'sessões';
    case 'rounds_count':
      return sportKey === 'jiujitsu' ? 'rolas' : sportKey === 'futevolei' ? 'sets' : 'rounds';
    case 'volume_kg':
    case 'weight_kg':
      return 'kg';
    case 'average_speed_kmh':
      return 'km/h';
    case 'average_pace_seconds_per_km':
      return 'min/km';
    case 'streak_days':
      return 'dias';
    default:
      return 'un';
  }
}

/**
 * Normaliza o tipo de métrica considerando compatibilidade com legados.
 */
export function resolveMetricType(goal: {
  metricType?: GoalMetricType;
  type?: string;
  sportKey?: SportKey | null;
}): GoalMetricType {
  if (goal.metricType) return goal.metricType;
  if (goal.type === 'frequency') return 'sessions_count';
  if (goal.type === 'volume') {
    if (goal.sportKey === 'strength') return 'volume_kg';
    if (goal.sportKey === 'boxing' || goal.sportKey === 'jiujitsu') return 'rounds_count';
    return 'distance_km';
  }
  if (goal.type === 'consistency') return 'streak_days';
  return 'sessions_count';
}

/**
 * Calcula o progresso atual de uma meta a partir das sessões dentro da janela temporal.
 */
export function calculateGoalProgress(
  goal: {
    scope?: GoalScope;
    sportKey?: SportKey | null;
    metricType?: GoalMetricType;
    type?: string;
    direction?: GoalDirection;
    targetValue: number;
    startValue?: number;
    unit?: string;
    deadline?: Date | string | null;
    status?: GoalStatus;
  },
  sessions: SessionDataForGoal[]
): GoalProgressResult {
  const metricType = resolveMetricType(goal);
  const direction: GoalDirection =
    goal.direction || (metricType === 'average_pace_seconds_per_km' ? 'decrease' : 'increase');

  // Filtra por esporte se escopo for específico
  const relevantSessions =
    goal.scope === 'overall' || !goal.sportKey
      ? sessions
      : sessions.filter((s) => s.sportKey === goal.sportKey);

  let currentValue = 0;
  const contributingSessions: ContributingSessionItem[] = [];

  if (direction === 'decrease' && metricType === 'average_pace_seconds_per_km') {
    // Redução de Pace: Menor valor é melhor
    const paceValues = relevantSessions
      .map((s) => ({
        s,
        pace: Number(s.metrics?.paceSecondsPerKm || 0),
      }))
      .filter((item) => item.pace > 0);

    if (paceValues.length > 0) {
      const best = paceValues.reduce((min, cur) => (cur.pace < min.pace ? cur : min));
      currentValue = best.pace;

      for (const item of paceValues) {
        contributingSessions.push({
          id: item.s.id || (item.s._id ? item.s._id.toString() : ''),
          startedAt: new Date(item.s.startedAt).toISOString(),
          sportKey: item.s.sportKey,
          value: item.pace,
          unit: 's/km',
        });
      }
    } else {
      currentValue = goal.startValue || goal.targetValue;
    }

    const start = goal.startValue && goal.startValue > goal.targetValue ? goal.startValue : goal.targetValue * 1.2;
    const target = goal.targetValue;

    let progressPercent = 0;
    if (paceValues.length > 0) {
      if (currentValue <= target) {
        progressPercent = 100;
      } else {
        const reductionAchieved = start - currentValue;
        const totalReductionNeeded = start - target;
        if (totalReductionNeeded > 0) {
          progressPercent = Math.min(100, Math.max(0, Math.round((reductionAchieved / totalReductionNeeded) * 100)));
        } else {
          progressPercent = currentValue <= target ? 100 : 0;
        }
      }
    }

    return buildProgressResult(goal, currentValue, progressPercent, contributingSessions);
  }

  // Melhores marcas (máximo no período)
  if (metricType === 'average_speed_kmh' || metricType === 'weight_kg') {
    let maxVal = 0;
    for (const s of relevantSessions) {
      const val = extractSessionMetricValue(s, metricType);
      if (val > 0) {
        if (val > maxVal) maxVal = val;
        contributingSessions.push({
          id: s.id || (s._id ? s._id.toString() : ''),
          startedAt: new Date(s.startedAt).toISOString(),
          sportKey: s.sportKey,
          value: val,
          unit: goal.unit || getDefaultUnitForMetric(metricType, s.sportKey),
        });
      }
    }
    currentValue = Math.round(maxVal * 10) / 10;
    const target = goal.targetValue > 0 ? goal.targetValue : 1;
    const progressPercent = Math.min(100, Math.round((currentValue / target) * 100));

    return buildProgressResult(goal, currentValue, progressPercent, contributingSessions);
  }

  // Streak de consistência (dias únicos de treino)
  if (metricType === 'streak_days' || goal.type === 'consistency') {
    const uniqueDays = new Set<string>();
    for (const s of relevantSessions) {
      const dateStr = new Date(s.startedAt).toISOString().split('T')[0];
      uniqueDays.add(dateStr);
      contributingSessions.push({
        id: s.id || (s._id ? s._id.toString() : ''),
        startedAt: new Date(s.startedAt).toISOString(),
        sportKey: s.sportKey,
        value: 1,
        unit: 'dia',
      });
    }
    currentValue = uniqueDays.size;
    const target = goal.targetValue > 0 ? goal.targetValue : 1;
    const progressPercent = Math.min(100, Math.round((currentValue / target) * 100));

    return buildProgressResult(goal, currentValue, progressPercent, contributingSessions);
  }

  // Cumulativas (soma total: distância, tempo, rounds, volume, sessões)
  let sum = 0;
  for (const s of relevantSessions) {
    const val = extractSessionMetricValue(s, metricType);
    if (val > 0) {
      sum += val;
      contributingSessions.push({
        id: s.id || (s._id ? s._id.toString() : ''),
        startedAt: new Date(s.startedAt).toISOString(),
        sportKey: s.sportKey,
        value: Math.round(val * 10) / 10,
        unit: goal.unit || getDefaultUnitForMetric(metricType, s.sportKey),
      });
    }
  }

  currentValue = Math.round(sum * 10) / 10;
  const target = goal.targetValue > 0 ? goal.targetValue : 1;
  const progressPercent = Math.min(100, Math.round((currentValue / target) * 100));

  return buildProgressResult(goal, currentValue, progressPercent, contributingSessions);
}

function buildProgressResult(
  goal: { targetValue: number; unit?: string; deadline?: Date | string | null },
  currentValue: number,
  progressPercent: number,
  contributingSessions: ContributingSessionItem[]
): GoalProgressResult {
  const isAchieved = progressPercent >= 100;
  let daysRemaining: number | undefined;
  let requiredPacePerWeek: string | undefined;

  if (goal.deadline) {
    const deadlineDate = new Date(goal.deadline);
    const diffMs = deadlineDate.getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    if (daysRemaining > 0 && progressPercent < 100) {
      const remainingValue = Math.max(0, goal.targetValue - currentValue);
      const weeksRemaining = daysRemaining / 7;
      const weeklyPace = Math.round((remainingValue / Math.max(0.1, weeksRemaining)) * 10) / 10;
      requiredPacePerWeek = `${weeklyPace} ${goal.unit || ''}/semana`;
    }
  }

  return {
    currentValue,
    progressPercent,
    isAchieved,
    daysRemaining,
    requiredPacePerWeek,
    contributingSessions,
  };
}

/**
 * Converte o documento Mongoose da Meta e o cálculo de progresso no DTO final.
 */
export function mapGoalToDTO(
  goal: IGoalDocument,
  progress: GoalProgressResult
): GoalDTO {
  let status: GoalStatus = goal.status;

  // Auto-expiração se o prazo passou sem atingir 100%
  if (
    goal.deadline &&
    new Date(goal.deadline) < new Date() &&
    !progress.isAchieved &&
    (goal.status === 'active' || goal.status === 'paused')
  ) {
    status = 'expired';
  } else if (progress.isAchieved && goal.status === 'active') {
    status = 'completed';
  }

  const contributingSessions = progress.contributingSessions || [];

  return {
    id: goal.id || (goal._id as any).toString(),
    userId: goal.userId,
    clientUuid: goal.clientUuid,
    title: goal.title,
    scope: (goal.scope as GoalScope) || 'sport',
    sportKey: goal.sportKey,
    metricType: (goal.metricType as GoalMetricType) || resolveMetricType(goal),
    direction: (goal.direction as GoalDirection) || 'increase',
    type: goal.type,
    targetValue: goal.targetValue,
    currentValue: progress.currentValue,
    startValue: goal.startValue,
    progressPercent: progress.progressPercent,
    unit: goal.unit || getDefaultUnitForMetric(goal.metricType as GoalMetricType, goal.sportKey),
    period: goal.period,
    startDate: goal.startDate,
    deadline: goal.deadline,
    status,
    notes: goal.notes,
    completedAt: goal.completedAt,
    pausedAt: goal.pausedAt,
    celebrationShown: goal.celebrationShown,
    daysRemaining: progress.daysRemaining,
    requiredPacePerWeek: progress.requiredPacePerWeek,
    contributingSessionsCount: contributingSessions.length,
    contributingSessions,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

