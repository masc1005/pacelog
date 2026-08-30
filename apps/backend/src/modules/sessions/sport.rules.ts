import type {
  SportKey,
  RunningMetrics,
  LegacyStrengthMetrics,
  BoxingMetrics,
  SwimmingMetrics,
} from '@pacelog/shared';
import { enrichSwimmingMetrics } from './swimming.rules.js';

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
export function enrichStrengthMetrics(metrics: LegacyStrengthMetrics): LegacyStrengthMetrics {
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
 * Enriquecimento automático de métricas de Ciclismo:
 * - Velocidade média em km/h = distanceKm / (durationSeconds / 3600)
 * - Pace equivalente em segundos por km = durationSeconds / distanceKm
 */
export function enrichCyclingMetrics(metrics: any, durationSeconds?: number): any {
  const duration = durationSeconds || metrics.durationSeconds || 60;
  const distanceKm = Number(metrics.distanceKm) || 0;

  // Calcula velocidade média diretamente: Distância (km) / Tempo (horas)
  const averageSpeedKmh = distanceKm > 0 && duration > 0
    ? Math.round((distanceKm / (duration / 3600)) * 10) / 10
    : (metrics.averageSpeedKmh || undefined);

  // Calcula ritmo em segundos por km: Tempo (segundos) / Distância (km)
  const paceSecondsPerKm = distanceKm > 0 && duration > 0
    ? Math.round(duration / distanceKm)
    : (metrics.paceSecondsPerKm || undefined);

  return {
    ...metrics,
    distanceKm,
    durationSeconds: duration,
    averageSpeedKmh,
    paceSecondsPerKm,
  };
}

/**
 * Despacha o enriquecimento de métricas de acordo com a modalidade.
 */
export function enrichSportMetrics(sportKey: SportKey, metrics: any, durationSeconds?: number): any {
  if (!metrics) return {};

  switch (sportKey) {
    case 'running':
      return enrichRunningMetrics(metrics);
    case 'strength':
      return enrichStrengthMetrics(metrics);
    case 'boxing':
      return enrichBoxingMetrics(metrics);
    case 'swimming':
      return enrichSwimmingMetrics(metrics, durationSeconds || 0);
    case 'cycling':
      return enrichCyclingMetrics(metrics, durationSeconds || 0);
    case 'football':
    case 'futevolei':
    default:
      return metrics;
  }
}

/**
 * Extrai a métrica principal de desempenho de uma sessão como `MetricSnapshot`.
 * A métrica primária é definida em `metric-definitions.ts` do pacote shared.
 *
 * Retorna `null` se a modalidade não tiver dados de desempenho suficientes.
 * Nunca compara métricas entre esportes diferentes.
 */
export function computePrimaryMetric(
  sportKey: SportKey,
  metrics: any,
  durationSeconds: number
): { key: string; label: string; value: number; unit: string; direction: string; comparability: string } | null {
  if (!metrics) return null;

  switch (sportKey) {
    case 'running': {
      const distKm = metrics.distanceMeters > 0 ? metrics.distanceMeters / 1000 : null;
      const pace = distKm && durationSeconds > 0
        ? Math.round(durationSeconds / distKm)
        : (metrics.paceSecondsPerKm ?? null);
      if (pace === null || pace <= 0) return null;
      return { key: 'paceSecondsPerKm', label: 'Pace médio', value: pace, unit: 's/km', direction: 'lower_is_better', comparability: 'same_metric' };
    }

    case 'cycling': {
      const speed = metrics.averageSpeedKmh ?? (metrics.distanceKm && durationSeconds > 0 ? Math.round((metrics.distanceKm / (durationSeconds / 3600)) * 10) / 10 : null);
      if (speed === null || speed <= 0) return null;
      return { key: 'averageSpeedKmh', label: 'Velocidade média', value: speed, unit: 'km/h', direction: 'higher_is_better', comparability: 'same_sport' };
    }

    case 'football': {
      const minutes = metrics.durationSeconds ? Math.round(metrics.durationSeconds / 60) : 0;
      if (minutes <= 0) return null;
      return { key: 'minutesPlayed', label: 'Minutos jogados', value: minutes, unit: 'min', direction: 'higher_is_better', comparability: 'same_sport' };
    }

    case 'futevolei': {
      const ratings: number[] = [];
      if (metrics.successfulReceptions != null) ratings.push(metrics.successfulReceptions);
      if (metrics.successfulSets != null) ratings.push(metrics.successfulSets);
      if (metrics.successfulAttacks != null) ratings.push(metrics.successfulAttacks);
      if (metrics.serves != null) ratings.push(metrics.serves);
      if (ratings.length === 0) {
        // fallback: sets vencidos
        const total = metrics.setsCount || 1;
        const won = metrics.setsWon ?? null;
        if (won === null) return null;
        const rate = Math.round((won / total) * 100);
        return { key: 'setsWonRate', label: 'Taxa de sets vencidos', value: rate, unit: '%', direction: 'higher_is_better', comparability: 'same_metric' };
      }
      const avg = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100;
      return { key: 'technicalAverage', label: 'Média técnica', value: avg, unit: '/5', direction: 'higher_is_better', comparability: 'same_metric' };
    }

    case 'boxing': {
      const completed = metrics.roundsCount ?? 0;
      if (completed <= 0) return null;
      // Considera 100% se não houver target definido (todos os rounds concluídos)
      return { key: 'roundCompletionRate', label: 'Conclusão de rounds', value: 100, unit: '%', direction: 'higher_is_better', comparability: 'same_metric' };
    }

    case 'strength': {
      const volume = metrics.totalVolumeKg ?? null;
      if (volume === null || volume <= 0) return null;
      return { key: 'totalVolumeKg', label: 'Volume total', value: volume, unit: 'kg', direction: 'neutral', comparability: 'same_metric' };
    }

    case 'swimming': {
      const pace = metrics.paceSecondsPer100m ?? null;
      if (pace === null || pace <= 0) return null;
      return { key: 'paceSecondsPer100m', label: 'Pace médio', value: pace, unit: 's/100m', direction: 'lower_is_better', comparability: 'same_metric' };
    }

    default:
      return null;
  }
}
