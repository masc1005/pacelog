import { z } from 'zod';

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

// ==========================================
// MÓDULO DE CONFIGURAÇÕES & PREFERÊNCIAS (SETTINGS)
// ==========================================

export type DistanceUnit = 'km' | 'mi';
export type WeightUnit = 'kg' | 'lb';
export type TimeFormat = '24h' | '12h';
export type Language = 'pt-BR' | 'en-US';
export type Theme = 'dark' | 'light' | 'system';
export type WeekStart = 'monday' | 'sunday';

export interface TrainingReminder {
  id: string;
  weekday: number; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  time: string; // HH:mm
  sportKey?: string;
  enabled: boolean;
}

export interface SportMetricConfig {
  metricKey: string;
  label: string;
  visible: boolean;
  order: number;
  isDefault: boolean;
  isMandatory?: boolean;
}

export interface UserSportDTO extends BaseEntity {
  userId: string;
  sportKey: string;
  isCustom: boolean;
  displayName: string;
  icon: string;
  color: string;
  isActive: boolean;
  metricsConfig: SportMetricConfig[];
}

export interface UserSettingsDTO extends BaseEntity {
  userId: string;
  distanceUnit: DistanceUnit;
  weightUnit: WeightUnit;
  timeFormat: TimeFormat;
  timezone: string;
  language: Language;
  theme: Theme;
  weekStart: WeekStart;
  weeklyVolumeGoalMinutes?: number;
  streakGraceDays: number;
  weeklyDigestEnabled: boolean;
  notificationsEnabled: boolean;
  trainingReminders: TrainingReminder[];
  achievementNotificationsEnabled: boolean;
}

export const updateSettingsSchema = z.object({
  distanceUnit: z.enum(['km', 'mi']).optional(),
  weightUnit: z.enum(['kg', 'lb']).optional(),
  timeFormat: z.enum(['24h', '12h']).optional(),
  timezone: z.string().optional(),
  language: z.enum(['pt-BR', 'en-US']).optional(),
  theme: z.enum(['dark', 'light', 'system']).optional(),
  weekStart: z.enum(['monday', 'sunday']).optional(),
  weeklyVolumeGoalMinutes: z.number().int().positive().optional().nullable(),
  streakGraceDays: z.number().int().min(0).max(3).optional(),
  weeklyDigestEnabled: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
  achievementNotificationsEnabled: z.boolean().optional(),
});

export const trainingReminderSchema = z.object({
  id: z.string().optional(),
  weekday: z.number().int().min(0).max(6),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Horário deve estar no formato HH:mm'),
  sportKey: z.string().optional(),
  enabled: z.boolean().default(true),
});

export const createCustomSportSchema = z.object({
  displayName: z.string().min(2, 'Nome do esporte deve ter no mínimo 2 caracteres').max(50),
  icon: z.string().default('Activity'),
  color: z.string().regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, 'Cor deve ser hexadecimal válido').default('#D4F684'),
  metricsConfig: z.array(
    z.object({
      metricKey: z.string(),
      label: z.string(),
      visible: z.boolean(),
      order: z.number(),
      isDefault: z.boolean(),
      isMandatory: z.boolean().optional(),
    })
  ).optional(),
});

export const updateSportMetricsSchema = z.object({
  isActive: z.boolean().optional(),
  metricsConfig: z.array(
    z.object({
      metricKey: z.string(),
      label: z.string(),
      visible: z.boolean(),
      order: z.number(),
      isDefault: z.boolean(),
      isMandatory: z.boolean().optional(),
    })
  ).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação de senha é obrigatória'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Nova senha e confirmação não conferem',
  path: ['confirmPassword'],
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal('EXCLUIR', {
    errorMap: () => ({ message: 'Digite EXCLUIR para confirmar a exclusão' }),
  }),
});

export const importBackupSchema = z.object({
  mode: z.enum(['merge', 'replace']).default('merge'),
  data: z.object({
    sessions: z.array(z.record(z.any())).optional().nullable(),
    goals: z.array(z.record(z.any())).optional().nullable(),
    shoes: z.array(z.record(z.any())).optional().nullable(),
    settings: z.record(z.any()).optional().nullable(),
    profile: z.record(z.any()).optional().nullable(),
    userSports: z.array(z.record(z.any())).optional().nullable(),
  }),
});

