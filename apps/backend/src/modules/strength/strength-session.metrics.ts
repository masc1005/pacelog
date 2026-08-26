import {
  calcSessionVolume,
  calcTotalReps,
  calcTotalSets,
  calcCompletedSets,
  calcSessionBestOneRepMax,
} from '@pacelog/shared';
import type { IActiveStrengthSessionDocument } from './strength-session.model.js';

export interface SessionFinalMetrics {
  durationSeconds: number;
  totalPausedSeconds: number;
  totalSets: number;
  completedSets: number;
  totalReps: number;
  totalVolumeKg: number | null;
  estimatedOneRepMax: number | null;
}

/**
 * Calcula as métricas finais de uma sessão no momento da finalização.
 * Recalcula tudo no backend para não confiar em dados do cliente.
 */
export function computeFinalMetrics(
  session: IActiveStrengthSessionDocument,
  finishedAt: Date
): SessionFinalMetrics {
  const exercises = session.exercises as any[];

  const startMs = new Date(session.startedAt).getTime();
  const finishMs = finishedAt.getTime();
  const elapsedSeconds = Math.round((finishMs - startMs) / 1000);
  const durationSeconds = Math.max(
    0,
    elapsedSeconds - session.totalPausedSeconds
  );

  const totalSets = calcTotalSets(exercises);
  const completedSets = calcCompletedSets(exercises);
  const totalReps = calcTotalReps(exercises);
  const totalVolumeKg = calcSessionVolume(exercises);
  const estimatedOneRepMax = calcSessionBestOneRepMax(exercises);

  return {
    durationSeconds,
    totalPausedSeconds: session.totalPausedSeconds,
    totalSets,
    completedSets,
    totalReps,
    totalVolumeKg,
    estimatedOneRepMax,
  };
}
