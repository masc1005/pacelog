import type {
  SportKey,
  RunningMetrics,
  LegacyStrengthMetrics,
  BoxingMetrics,
  SwimmingMetrics,
} from '@pacelog/shared';
import { enrichSwimmingMetrics } from './swimming.rules.js';

export const SPORT_MUSCLE_IMPACT: Record<string, string[]> = {
  running: ['quadriceps', 'posteriores', 'gluteos', 'panturrilhas', 'joelhos', 'tornozelos', 'quadris'],
  futevolei: ['quadriceps', 'posteriores', 'gluteos', 'panturrilhas', 'joelhos', 'tornozelos', 'quadris', 'core', 'lombar'],
  football: ['quadriceps', 'posteriores', 'gluteos', 'panturrilhas', 'joelhos', 'tornozelos', 'quadris', 'core'],
  cycling: ['quadriceps', 'posteriores', 'gluteos', 'panturrilhas', 'joelhos', 'quadris'],
  boxing: ['ombros', 'costas', 'peito', 'triceps', 'antebracos', 'pegada', 'core', 'cotovelos', 'punhos'],
  jiujitsu: ['ombros', 'costas', 'lombar', 'antebracos', 'pegada', 'core', 'quadris', 'joelhos', 'cotovelos', 'punhos'],
  swimming: ['ombros', 'costas', 'peito', 'triceps', 'core', 'cotovelos'],
};

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
export function enrichRunningMetrics(metrics: RunningMetrics, durationSeconds?: number): RunningMetrics {
  const duration = durationSeconds || metrics.durationSeconds || 0;
  const distanceMeters =
    metrics.distanceMeters && metrics.distanceMeters > 0
      ? Number(metrics.distanceMeters)
      : (metrics as any).distanceKm
        ? Math.round(Number((metrics as any).distanceKm) * 1000)
        : 0;

  const paceSecondsPerKm =
    metrics.paceSecondsPerKm && metrics.paceSecondsPerKm > 0
      ? metrics.paceSecondsPerKm
      : calculateRunningPace(distanceMeters, duration);

  return {
    ...metrics,
    distanceMeters,
    durationSeconds: duration || metrics.durationSeconds,
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
  let maxWeightKg = 0;

  if (Array.isArray(metrics.exercises)) {
    for (const exercise of metrics.exercises) {
      if (Array.isArray(exercise.sets)) {
        for (const set of exercise.sets) {
          totalSets += 1;
          const reps = Number(set.reps) || 0;
          const weight = Number(set.weightKg) || 0;
          totalReps += reps;
          if (weight > maxWeightKg) maxWeightKg = weight;

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
    totalVolumeKg: totalVolumeKg > 0 ? Math.round(totalVolumeKg * 100) / 100 : (metrics.totalVolumeKg || 0),
    totalSets: totalSets > 0 ? totalSets : (metrics.totalSets || 0),
    totalReps: totalReps > 0 ? totalReps : (metrics.totalReps || 0),
    ...(maxWeightKg > 0 ? { maxWeightKg } : {}),
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
  const distanceKm =
    metrics.distanceKm != null
      ? Number(metrics.distanceKm)
      : metrics.distanceMeters
        ? Math.round((Number(metrics.distanceMeters) / 1000) * 100) / 100
        : 0;

  // Calcula velocidade média diretamente: Distância (km) / Tempo (horas)
  const averageSpeedKmh = distanceKm > 0 && duration > 0
    ? Math.round((distanceKm / (duration / 3600)) * 10) / 10
    : (metrics.averageSpeedKmh || metrics.avgSpeedKmh || undefined);

  // Calcula ritmo em segundos por km: Tempo (segundos) / Distância (km)
  const paceSecondsPerKm = distanceKm > 0 && duration > 0
    ? Math.round(duration / distanceKm)
    : (metrics.paceSecondsPerKm || undefined);

  const avgHeartRate = metrics.avgHeartRate ?? metrics.averageHeartRate;

  return {
    ...metrics,
    distanceKm,
    distanceMeters: distanceKm > 0 ? Math.round(distanceKm * 1000) : metrics.distanceMeters,
    durationSeconds: duration,
    averageSpeedKmh,
    paceSecondsPerKm,
    ...(avgHeartRate !== undefined ? { avgHeartRate, averageHeartRate: avgHeartRate } : {}),
  };
}

/**
 * Enriquecimento de métricas de Jiu-Jitsu:
 * - Injeta durationSeconds se omitido
 * - Garante valores numéricos padrão e normaliza gi / giType / trainingType / sessionType
 */
export function enrichJiuJitsuMetrics(metrics: any, durationSeconds?: number): any {
  const duration = durationSeconds || metrics.durationSeconds || 60;
  const giBoolean =
    typeof metrics.gi === 'boolean'
      ? metrics.gi
      : metrics.giType === 'gi'
        ? true
        : metrics.giType === 'nogi'
          ? false
          : true;
  const giType = metrics.giType || (giBoolean ? 'gi' : 'nogi');
  const trainingType = metrics.trainingType || metrics.sessionType;

  return {
    ...metrics,
    durationSeconds: duration,
    gi: giBoolean,
    giType,
    ...(trainingType ? { trainingType, sessionType: trainingType } : {}),
    roundsCount: metrics.roundsCount != null ? Number(metrics.roundsCount) : undefined,
    submissionsLanded: metrics.submissionsLanded != null ? Number(metrics.submissionsLanded) : undefined,
    submissionsReceived: metrics.submissionsReceived != null ? Number(metrics.submissionsReceived) : undefined,
  };
}

/**
 * Despacha o enriquecimento de métricas de acordo com a modalidade.
 */
export function enrichSportMetrics(sportKey: SportKey, metrics: any, durationSeconds?: number): any {
  if (!metrics) return {};

  switch (sportKey) {
    case 'running':
      return enrichRunningMetrics(metrics, durationSeconds);
    case 'strength':
      return enrichStrengthMetrics(metrics);
    case 'boxing':
      return enrichBoxingMetrics(metrics);
    case 'swimming': {
      const enriched = enrichSwimmingMetrics(metrics, durationSeconds || metrics.durationSeconds || 0);
      const hr = metrics.avgHeartRate ?? metrics.averageHeartRate;
      return {
        ...enriched,
        ...(hr !== undefined ? { avgHeartRate: hr, averageHeartRate: hr } : {}),
      };
    }
    case 'cycling':
      return enrichCyclingMetrics(metrics, durationSeconds);
    case 'jiujitsu':
      return enrichJiuJitsuMetrics(metrics, durationSeconds);
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
      const distKm = metrics.distanceMeters > 0 ? metrics.distanceMeters / 1000 : (metrics.distanceKm > 0 ? metrics.distanceKm : null);
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
      const dur = metrics.durationSeconds || durationSeconds || 0;
      const minutes = metrics.minutesPlayed ?? (dur > 0 ? Math.round(dur / 60) : 0);
      if (minutes <= 0) return null;
      return { key: 'minutesPlayed', label: 'Minutos jogados', value: minutes, unit: 'min', direction: 'higher_is_better', comparability: 'same_sport' };
    }

    case 'futevolei': {
      if (metrics.setsCount > 0 && metrics.setsWon != null) {
        const rate = Math.round((metrics.setsWon / metrics.setsCount) * 100);
        return { key: 'setsWonRate', label: 'Taxa de sets vencidos', value: rate, unit: '%', direction: 'higher_is_better', comparability: 'same_metric' };
      }
      if (metrics.setsCount > 0) {
        return { key: 'setsCount', label: 'Sets por sessão', value: metrics.setsCount, unit: 'sets', direction: 'higher_is_better', comparability: 'same_sport' };
      }
      return null;
    }

    case 'boxing': {
      const completed = metrics.roundsCount ?? 0;
      if (completed <= 0) return null;
      return { key: 'roundsCount', label: 'Rounds concluídos', value: completed, unit: 'rounds', direction: 'higher_is_better', comparability: 'same_metric' };
    }

    case 'strength': {
      const volume = metrics.totalVolumeKg ?? null;
      if (volume === null || volume <= 0) return null;
      return { key: 'totalVolumeKg', label: 'Volume total', value: volume, unit: 'kg', direction: 'neutral', comparability: 'same_metric' };
    }

    case 'swimming': {
      const pace = metrics.paceSecondsPer100m ?? null;
      if (pace && pace > 0) {
        return { key: 'paceSecondsPer100m', label: 'Pace médio', value: pace, unit: 's/100m', direction: 'lower_is_better', comparability: 'same_metric' };
      }
      const dist = metrics.totalDistanceMeters ?? metrics.distanceMeters ?? 0;
      if (dist > 0) {
        return { key: 'totalDistanceMeters', label: 'Distância', value: dist, unit: 'm', direction: 'higher_is_better', comparability: 'same_metric' };
      }
      return null;
    }

    case 'jiujitsu': {
      const rounds = metrics.roundsCount ?? 0;
      if (rounds <= 0) return null;
      return { key: 'roundsCount', label: 'Rolas por sessão', value: rounds, unit: 'rolas', direction: 'higher_is_better', comparability: 'same_sport' };
    }

    default:
      return null;
  }
}
