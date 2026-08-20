import type {
  SportKey,
  RunningMetrics,
  StrengthMetrics,
  BoxingMetrics,
} from '@pacelog/shared';

/**
 * Calcula a Carga Fisiológica da Sessão (Foster sRPE / TRIMP modificado).
 * Fórmula: sessionalLoad = (Duração em minutos) * RPE
 * @param durationSeconds Duração da sessão em segundos
 * @param rpe Percepção Subjetiva de Esforço (Escala Borg CR10: 1 a 10)
 */
export function calculateSessionalLoad(durationSeconds: number, rpe: number): number {
  if (durationSeconds <= 0 || rpe <= 0) return 0;
  const durationMinutes = durationSeconds / 60;
  return Math.round(durationMinutes * rpe);
}

/**
 * Calcula o Pace Médio de corrida em segundos por quilômetro.
 * @param distanceMeters Distância percorrida em metros
 * @param durationSeconds Duração em segundos
 */
export function calculateRunningPace(
  distanceMeters: number,
  durationSeconds: number
): number {
  if (distanceMeters <= 0 || durationSeconds <= 0) return 0;
  const distanceKm = distanceMeters / 1000;
  return Math.round(durationSeconds / distanceKm);
}

/**
 * Enriquecimento automático de métricas de Corrida (Pace e consistência).
 */
export function enrichRunningMetrics(metrics: RunningMetrics): RunningMetrics {
  const paceSecondsPerKm =
    metrics.paceSecondsPerKm && metrics.paceSecondsPerKm > 0
      ? metrics.paceSecondsPerKm
      : calculateRunningPace(metrics.distanceMeters, metrics.durationSeconds);

  return {
    ...metrics,
    paceSecondsPerKm,
  };
}

/**
 * Enriquecimento automático de métricas de Musculação:
 * - Volume Total de Carga (kg acumulados = soma de reps * peso das séries válidas)
 * - Total de Séries
 * - Total de Repetições
 */
export function enrichStrengthMetrics(metrics: StrengthMetrics): StrengthMetrics {
  let totalVolumeKg = 0;
  let totalSets = 0;
  let totalReps = 0;

  if (Array.isArray(metrics.exercises)) {
    for (const exercise of metrics.exercises) {
      if (Array.isArray(exercise.sets)) {
        for (const set of exercise.sets) {
          totalSets += 1;
          const reps = Number(set.reps) || 0;
          const weight = Number(set.weightKg) || 0;
          totalReps += reps;

          // Séries de aquecimento não entram na contagem do volume total de carga de trabalho
          if (!set.isWarmup && reps > 0 && weight > 0) {
            totalVolumeKg += reps * weight;
          }
        }
      }
    }
  }

  return {
    ...metrics,
    totalVolumeKg: Math.round(totalVolumeKg * 100) / 100,
    totalSets,
    totalReps,
  };
}

/**
 * Enriquecimento automático de métricas de Boxe:
 * - Duração total calculada a partir dos rounds e intervalos de descanso.
 */
export function enrichBoxingMetrics(metrics: BoxingMetrics): BoxingMetrics {
  const rounds = Number(metrics.roundsCount) || 1;
  const roundSec = Number(metrics.roundDurationSeconds) || 180;
  const restSec = Number(metrics.restDurationSeconds) || 60;

  const calculatedTotalSec =
    rounds * roundSec + Math.max(0, rounds - 1) * restSec;

  const totalDurationSeconds =
    metrics.totalDurationSeconds && metrics.totalDurationSeconds > 0
      ? metrics.totalDurationSeconds
      : calculatedTotalSec;

  return {
    ...metrics,
    roundsCount: rounds,
    roundDurationSeconds: roundSec,
    restDurationSeconds: restSec,
    totalDurationSeconds,
  };
}

/**
 * Despacha o enriquecimento de métricas de acordo com a modalidade.
 */
export function enrichSportMetrics(sportKey: SportKey, metrics: any): any {
  if (!metrics) return {};

  switch (sportKey) {
    case 'running':
      return enrichRunningMetrics(metrics);
    case 'strength':
      return enrichStrengthMetrics(metrics);
    case 'boxing':
      return enrichBoxingMetrics(metrics);
    case 'football':
    case 'futevolei':
    default:
      return metrics;
  }
}
