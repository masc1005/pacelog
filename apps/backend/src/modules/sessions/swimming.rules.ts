import type { SwimmingMetrics } from '@pacelog/shared';
import { calculateSwimmingPace, calculateTotalLaps } from '@pacelog/shared';

/**
 * Enriquecimento automático de métricas de Natação:
 * - Pace médio (segundos por 100m)
 * - Número de piscinas (se for ambiente de piscina e o tamanho for informado)
 */
export function enrichSwimmingMetrics(metrics: SwimmingMetrics, durationSeconds: number): SwimmingMetrics {
  const distanceMeters = metrics.totalDistanceMeters || 0;

  const paceSecondsPer100m =
    metrics.paceSecondsPer100m && metrics.paceSecondsPer100m > 0
      ? metrics.paceSecondsPer100m
      : calculateSwimmingPace(durationSeconds, distanceMeters);

  let totalLaps = metrics.totalLaps;
  if (metrics.environment === 'pool' && metrics.poolLengthMeters && metrics.poolLengthMeters > 0) {
    if (!totalLaps || totalLaps <= 0) {
      totalLaps = calculateTotalLaps(distanceMeters, metrics.poolLengthMeters);
    }
  }

  return {
    ...metrics,
    paceSecondsPer100m: paceSecondsPer100m > 0 ? paceSecondsPer100m : undefined,
    totalLaps,
  };
}
