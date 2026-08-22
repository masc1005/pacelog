import type { MetricSnapshot } from './load.types.js';
import type { SportKey } from '../index.js';

// ==========================================
// SNAPSHOTS DE DESEMPENHO POR ESPORTE
// ==========================================

export type RunningPerformanceSnapshot = {
  paceSecondsPerKm: number | null;       // lower_is_better
  totalDistanceKm: number;
  bestPaceSecondsPerKm: number | null;
};

export type FootballPerformanceSnapshot = {
  minutesPlayed: number;                 // higher_is_better (sem GPS)
  totalDistanceMeters: number | null;    // higher_is_better (com GPS)
  goals: number;
  assists: number;
};

export type FutevoleiPerformanceSnapshot = {
  technicalAverage: number | null;       // média de ratings técnicos, higher_is_better
  setsWonRate: number | null;            // % de sets vencidos, higher_is_better
  setsCount: number;
};

export type BoxingPerformanceSnapshot = {
  roundCompletionRate: number | null;    // % de rounds concluídos, higher_is_better
  roundsCompleted: number;
  roundsTarget: number;
};

export type StrengthPerformanceSnapshot = {
  totalVolumeKg: number;                 // higher_is_better (porém contexto importa)
  totalSets: number;
  totalReps: number;
};

export type SportPerformanceSnapshot =
  | { sportKey: 'running'; data: RunningPerformanceSnapshot }
  | { sportKey: 'football'; data: FootballPerformanceSnapshot }
  | { sportKey: 'futevolei'; data: FutevoleiPerformanceSnapshot }
  | { sportKey: 'boxing'; data: BoxingPerformanceSnapshot }
  | { sportKey: 'strength'; data: StrengthPerformanceSnapshot };

/**
 * Snapshot consolidado do desempenho de uma sessão em uma métrica primária.
 * Sempre inclui unidade e direção — nunca exibe número isolado.
 */
export type PrimaryMetricSnapshot = MetricSnapshot & {
  sportKey: SportKey;
};
