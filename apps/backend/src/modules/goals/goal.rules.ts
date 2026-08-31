import type { SportKey, GoalType, GoalPeriod, GoalDTO, GoalStatus } from '@pacelog/shared';
import type { IGoalDocument } from './goal.model.js';

export interface GoalProgressResult {
  currentValue: number;
  progressPercent: number;
  isAchieved: boolean;
}

export interface SessionDataForGoal {
  startedAt: Date | string;
  sportKey: SportKey;
  durationSeconds?: number;
  metrics?: Record<string, any>;
}

/**
 * Determina a data de início da janela de avaliação da meta com base no período.
 */
export function resolveGoalTimeWindow(
  period: GoalPeriod,
  startDate: Date,
  now = new Date()
): Date {
  switch (period) {
    case 'weekly':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'custom':
    default:
      return startDate;
  }
}

/**
 * Extrai o valor de volume de uma sessão com base no esporte.
 */
export function extractSessionVolume(session: SessionDataForGoal): number {
  const { sportKey, metrics, durationSeconds = 0 } = session;

  if (sportKey === 'running' && metrics?.distanceMeters) {
    return metrics.distanceMeters / 1000; // km
  }
  if (sportKey === 'cycling' && metrics?.distanceKm) {
    return metrics.distanceKm; // km
  }
  if (sportKey === 'strength' && metrics?.totalVolumeKg) {
    return metrics.totalVolumeKg; // kg
  }
  if (sportKey === 'boxing' && metrics?.roundsCount) {
    return metrics.roundsCount; // rounds
  }
  if (sportKey === 'jiujitsu' && metrics?.roundsCount) {
    return metrics.roundsCount; // rolas
  }
  return Math.round(durationSeconds / 60); // minutos como fallback
}

/**
 * Calcula o progresso atual de uma meta a partir das sessões dentro da janela temporal.
 */
export function calculateGoalProgress(
  goal: { type: GoalType; targetValue: number; sportKey?: SportKey | null },
  sessions: SessionDataForGoal[]
): GoalProgressResult {
  const relevantSessions = goal.sportKey
    ? sessions.filter((s) => s.sportKey === goal.sportKey)
    : sessions;

  let currentValue = 0;

  switch (goal.type) {
    case 'frequency':
      currentValue = relevantSessions.length;
      break;

    case 'volume': {
      const sum = relevantSessions.reduce((acc, s) => acc + extractSessionVolume(s), 0);
      currentValue = Math.round(sum * 10) / 10;
      break;
    }

    case 'consistency': {
      const uniqueDays = new Set<string>();
      for (const s of relevantSessions) {
        const dateStr = new Date(s.startedAt).toISOString().split('T')[0];
        uniqueDays.add(dateStr);
      }
      currentValue = uniqueDays.size;
      break;
    }
  }

  const target = goal.targetValue > 0 ? goal.targetValue : 1;
  const progressPercent = Math.min(100, Math.round((currentValue / target) * 100));
  const isAchieved = progressPercent >= 100;

  return {
    currentValue,
    progressPercent,
    isAchieved,
  };
}

/**
 * Converte o documento Mongoose da Meta e o cálculo de progresso no DTO final.
 */
export function mapGoalToDTO(
  goal: IGoalDocument,
  progress: GoalProgressResult
): GoalDTO {
  const status: GoalStatus =
    progress.isAchieved && goal.status === 'active' ? 'achieved' : goal.status;

  return {
    id: goal.id || (goal._id as any).toString(),
    userId: goal.userId,
    title: goal.title,
    type: goal.type,
    sportKey: goal.sportKey,
    targetValue: goal.targetValue,
    currentValue: progress.currentValue,
    progressPercent: progress.progressPercent,
    unit: goal.unit,
    period: goal.period,
    startDate: goal.startDate,
    deadline: goal.deadline,
    status,
    notes: goal.notes,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}
