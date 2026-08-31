// ==========================================
// MÓDULO DE MUSCULAÇÃO (SESSÃO ATIVA)
// ==========================================
export * from './strength/strength.enums.js';
export * from './strength/strength.types.js';
export * from './strength/strength.schemas.js';
export * from './strength/strength.metrics.js';
export * from './strength/strength.session.js';

// ==========================================
// MÓDULO DE EXERCÍCIOS
// ==========================================
export * from './exercises/exercise.enums.js';
export * from './exercises/exercise.types.js';

// ==========================================
// MÓDULO DE MÉTRICAS V2 (CARGA E PROGRESSO)
// ==========================================
export * from './metrics/load.types.js';
export * from './metrics/external-metrics.types.js';
export * from './metrics/performance.types.js';
export * from './metrics/progress.types.js';
export * from './metrics/metric-definitions.js';
export * from './swimming/swimming.types.js';
export { calculateSwimmingPace, calculateTotalLaps, calculateSwolf } from './swimming/swimming.metrics.js';
import { SwimmingMetrics } from './swimming/swimming.types.js';
export * from './cycling/cycling.types.js';
export { calculateCyclingSpeed, calculateCyclingPace } from './cycling/cycling.metrics.js';
import { CyclingMetrics } from './cycling/cycling.types.js';
export * from './jiujitsu/jiujitsu.types.js';
import { JiuJitsuMetrics } from './jiujitsu/jiujitsu.types.js';

// Tênis / Shoes Tracker
export * from './shoes/index.js';

export const SPORT_KEYS = [
  'running',
  'football',
  'futevolei',
  'boxing',
  'strength',
  'swimming',
  'cycling',
  'jiujitsu',
] as const;

export type SportKey = (typeof SPORT_KEYS)[number];

export const SESSION_STATUSES = ['completed', 'in_progress', 'discarded'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export interface BaseEntity {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ==========================================
// MÉTRICAS ESPECIALIZADAS POR MODALIDADE
// ==========================================

export interface SplitMarker {
  km: number;
  splitTimeSeconds: number;
  paceSecondsPerKm: number;
  elevationMeters?: number;
}

export type RunningSurface = 'road' | 'track' | 'trail' | 'treadmill' | 'mixed' | 'other';
export type RunningType = 'base' | 'interval' | 'long' | 'recovery' | 'race' | 'other';

export interface RunningMetrics {
  distanceMeters: number;
  durationSeconds: number;
  paceSecondsPerKm?: number;
  elevationGainMeters?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  cadenceAvg?: number;
  splits?: SplitMarker[];
  shoeId?: string;
  surface?: RunningSurface;
  runningType?: RunningType;
  elevationMeters?: number; // Alias ou complemento de elevationGainMeters para fins de histórico
  notes?: string;
}

export interface FootballMetrics {
  matchType: 'futebol_campo' | 'society_7' | 'futsal' | 'treino';
  durationSeconds: number;
  goals?: number;
  assists?: number;
  position?: 'goleiro' | 'zagueiro' | 'lateral' | 'meia' | 'atacante';
  physicalIntensity?: number; // 1 a 10
  matchResult?: 'win' | 'loss' | 'draw';
  distanceEstimatedKm?: number;
  notes?: string;
}

export interface FutevoleiSet {
  setNumber: number;
  pointsScored: number;
  pointsConceded: number;
}

export interface FutevoleiMetrics {
  setsCount: number;
  setsWon?: number;
  setsLost?: number;
  matches?: FutevoleiSet[];
  durationSeconds: number;
  aces?: number;
  attackErrors?: number;
  successfulReceptions?: number;
  successfulSets?: number;
  successfulAttacks?: number;
  serves?: number;
  partnerName?: string;
  courtType?: 'sand_beach' | 'sand_court';
  notes?: string;
}

export interface BoxingMetrics {
  roundsCount: number;
  roundDurationSeconds: number;
  restDurationSeconds: number;
  totalDurationSeconds: number;
  punchesThrownEstimate?: number;
  sparring?: boolean;
  focusArea?: 'bag_work' | 'sparring' | 'pad_work' | 'technique' | 'conditioning';
  notes?: string;
}

/** @deprecated Use StrengthSet from strength/strength.types instead */
export interface LegacyStrengthSet {
  setNumber: number;
  reps: number;
  weightKg: number;
  rpe?: number;
  isWarmup?: boolean;
}

/** @deprecated Use StrengthExerciseEntry from strength/strength.types instead */
export interface LegacyStrengthExercise {
  exerciseName: string;
  targetMuscleGroup?: string;
  sets: LegacyStrengthSet[];
}

/** @deprecated Use CompletedStrengthSession.exercises for the new format */
export interface LegacyStrengthMetrics {
  exercises: LegacyStrengthExercise[];
  totalVolumeKg?: number;
  totalSets?: number;
  totalReps?: number;
  durationSeconds: number;
  notes?: string;
}

export type SportMetrics =
  | RunningMetrics
  | FootballMetrics
  | FutevoleiMetrics
  | BoxingMetrics
  | LegacyStrengthMetrics
  | SwimmingMetrics
  | CyclingMetrics
  | JiuJitsuMetrics;

// ==========================================
// SESSÃO DE TREINO DTO
// ==========================================

export interface SessionDTO extends BaseEntity {
  userId: string;
  clientUuid?: string;
  sportKey: SportKey;
  startedAt: Date | string;
  endedAt?: Date | string;
  durationSeconds: number;
  rpe: number; // 1 a 10 (Escala Borg CR10)
  sessionalLoad: number; // Foster TRIMP (minutos * RPE)
  status: SessionStatus;
  metrics: Record<string, any>;
  notes?: string;
}

export interface SportSummaryStats {
  sportKey: SportKey;
  totalSessions: number;
  totalDurationSeconds: number;
  totalSessionalLoad: number;
}

export interface SessionSummaryDTO {
  totalSessions: number;
  totalDurationSeconds: number;
  totalSessionalLoad: number;
  averageRpe: number;
  streakDays: number;
  bySport: SportSummaryStats[];
}

// ==========================================
// MÓDULO DE METAS (GOALS)
// ==========================================

export const GOAL_TYPES = ['frequency', 'volume', 'consistency'] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const GOAL_PERIODS = ['weekly', 'monthly', 'custom'] as const;
export type GoalPeriod = (typeof GOAL_PERIODS)[number];

export const GOAL_STATUSES = ['active', 'achieved', 'paused', 'abandoned'] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export interface GoalDTO extends BaseEntity {
  userId: string;
  title: string;
  type: GoalType;
  sportKey?: SportKey | null;
  targetValue: number;
  currentValue: number;
  progressPercent: number;
  unit: string; // 'sessions' | 'km' | 'kg' | 'rounds' | 'days'
  period: GoalPeriod;
  startDate: Date | string;
  deadline?: Date | string | null;
  status: GoalStatus;
  notes?: string;
}

// ==========================================
// MÓDULO DE TELEMETRIA & EVOLUÇÃO (PROGRESS)
// ==========================================

/**
 * Status descritivo de variabilidade de carga (ACWR).
 * Vocabulário sem linguagem médica ou diagnóstica.
 *
 * @deprecated Os valores de status abaixo substituem os anteriores:
 *   'optimal'       → 'baseline'
 *   'under-training'→ 'below_baseline'
 *   'over-reaching' → 'elevated_vs_baseline'
 *   'danger_zone'   → 'high_variation'
 */
export type AcwrStatus =
  | 'baseline'              // dentro do padrão histórico
  | 'below_baseline'        // abaixo da média recente
  | 'elevated_vs_baseline'  // acima da média recente
  | 'high_variation'        // variação relevante na carga
  | 'insufficient_data';    // histórico insuficiente

export interface AcwrReadout {
  acuteLoad: number;      // Soma de carga dos últimos 7 dias
  chronicLoad: number;    // Média semanal de carga dos últimos 28 dias
  ratio: number;          // acuteLoad / chronicLoad
  status: AcwrStatus;     // Status descritivo (sem linguagem médica)
  /** @deprecated Alias legado para clientes antigos. Use `status`. */
  legacyStatus?: string;  // ex: 'danger_zone' — somente se necessário para compatibilidade
  message: string;        // descrição comparativa com o histórico
  disclaimer: string;     // lembrete: comparação descritiva, não avaliação médica
}

export interface WeeklyTrendPoint {
  weekLabel: string; // Ex: 'Sem 32' ou '12/08'
  startDate: string;
  totalLoad: number;
  totalDurationSeconds: number;
  sessionsCount: number;
  sportVolume?: number; // km ou kg ou rounds
}

export interface SportProgressDTO {
  sportKey: SportKey;
  totalSessions: number;
  totalDurationSeconds: number;
  totalSessionalLoad: number;
  weeklyTrend: WeeklyTrendPoint[];
  sportSpecificHighlights: Record<string, any>;
}

export interface PersonalRecordItem {
  id: string;
  sportKey: SportKey;
  metricLabel: string;
  value: number | string;
  unit: string;
  achievedAt: Date | string;
  sessionId?: string;
}

export interface ProgressOverviewDTO {
  acwr: AcwrReadout;
  totalActiveDaysStreak: number;
  weeklyTotalDurationSeconds: number;
  weeklyTotalSessionalLoad: number;
  weeklySessionsCount: number;
  sportsBreakdown: SportSummaryStats[];
  recentPersonalRecords: PersonalRecordItem[];
}

// ==========================================
// MÓDULO DE NOTIFICAÇÕES & ALERTAS
// ==========================================

export const NOTIFICATION_TYPES = [
  'goal_achieved',
  'acwr_danger',
  'acwr_warning',
  'streak_broken',
  'streak_milestone',
  'pr_set',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationDTO extends BaseEntity {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, any>;
  readAt: Date | string | null;
}

// ==========================================
// MÓDULO DE EXPORTAÇÃO
// ==========================================

export interface WeeklyReportDTO {
  weekLabel: string;
  startDate: string;
  endDate: string;
  acwr: AcwrReadout;
  totalDurationSeconds: number;
  totalSessionalLoad: number;
  sessionsCount: number;
  goalsAchieved: number;
  prsSet: number;
}

// ==========================================
// MÓDULO DE INSIGHTS COM IA (GEMINI)
// ==========================================

export interface AIInsightDTO extends BaseEntity {
  userId: string;
  content: string;
  type: 'daily_coach' | 'daily_progress' | 'recovery_warning' | 'milestone_celebration' | 'session_analysis';
  sessionId?: string;
}
