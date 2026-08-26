import type {
  LoadUnit,
  SetStatus,
  StrengthSetType,
  ActiveSessionStatus,
  StrengthSessionStatus,
} from './strength.enums.js';

// ==========================================
// SÉRIE DE MUSCULAÇÃO
// ==========================================

export type StrengthSet = {
  id: string;
  setNumber: number;
  status: SetStatus;
  type: StrengthSetType;

  reps?: number;
  load?: number;
  loadUnit: LoadUnit;

  /** Duração total da série em segundos (para exercícios isométricos, etc.) */
  durationSeconds?: number;
  /** Tempo de descanso planejado em segundos */
  restSeconds?: number;
  /** Reps In Reserve */
  rir?: number;
  /** Rate of Perceived Exertion (1–10, Borg CR10) */
  rpe?: number;

  notes?: string;
  completedAt?: string;
};

// ==========================================
// EXERCÍCIO DENTRO DA SESSÃO
// ==========================================

export type StrengthExerciseEntry = {
  id: string;
  /** Chave estável do exercício na biblioteca */
  exerciseKey: string;
  /** Nome do exercício no momento em que foi adicionado à sessão */
  exerciseNameSnapshot: string;
  primaryMuscleGroup?: string;
  equipment?: string;
  order: number;
  notes?: string;
  sets: StrengthSet[];
};

// ==========================================
// SESSÃO ATIVA (estado transitório)
// ==========================================

export type ActiveStrengthSession = {
  id: string;
  userId: string;
  sportKey: 'strength';
  status: ActiveSessionStatus;

  startedAt: string;
  /** Timestamp de quando a sessão foi pausada pela última vez */
  pausedAt?: string;
  /** Total de segundos acumulados em pausa */
  totalPausedSeconds: number;
  lastActivityAt: string;

  exercises: StrengthExerciseEntry[];
  notes?: string;

  /**
   * Número monotônico de versão da sessão no cliente.
   * Incrementado a cada mutação para detecção de conflito.
   */
  clientVersion: number;
  createdAt: string;
  updatedAt: string;
};

// ==========================================
// SESSÃO CONCLUÍDA (estado persistido)
// ==========================================

export type CompletedStrengthSession = {
  id: string;
  userId: string;
  sportKey: 'strength';
  status: 'completed';

  startedAt: string;
  finishedAt: string;
  durationSeconds: number;
  totalPausedSeconds: number;

  exercises: StrengthExerciseEntry[];
  totalSets: number;
  completedSets: number;
  totalReps: number;
  /** Volume total em kg (null para sessões sem carga numérica real) */
  totalVolumeKg?: number | null;
  /** 1RM estimado mais alto da sessão */
  estimatedOneRepMax?: number;

  notes?: string;
  createdAt: string;
  updatedAt: string;
};

// ==========================================
// TIMER DE DESCANSO (estado local no cliente)
// ==========================================

export type RestTimer = {
  isRunning: boolean;
  /** Timestamp em que o timer foi iniciado (ISO 8601) */
  startedAt?: string;
  durationSeconds: number;
  remainingSeconds: number;
  exerciseId?: string;
  setId?: string;
};

// ==========================================
// TIPOS DE RESPOSTA DA API
// ==========================================

export interface StrengthSessionConflictError {
  code: 'STRENGTH_SESSION_VERSION_CONFLICT';
  message: string;
  serverVersion: number;
}
