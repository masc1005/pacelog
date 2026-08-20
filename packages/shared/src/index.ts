export const SPORT_KEYS = [
  'running',
  'football',
  'futevolei',
  'boxing',
  'strength',
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

export interface RunningMetrics {
  distanceMeters: number;
  durationSeconds: number;
  paceSecondsPerKm?: number;
  elevationGainMeters?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  cadenceAvg?: number;
  splits?: SplitMarker[];
  shoesId?: string;
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

export interface StrengthSet {
  setNumber: number;
  reps: number;
  weightKg: number;
  rpe?: number;
  isWarmup?: boolean;
}

export interface StrengthExercise {
  exerciseName: string;
  targetMuscleGroup?: string;
  sets: StrengthSet[];
}

export interface StrengthMetrics {
  exercises: StrengthExercise[];
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
  | StrengthMetrics;

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
