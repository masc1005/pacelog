import { SportKey } from './sport.types.js';

export type SessionStatus = 'draft' | 'planned' | 'completed' | 'cancelled';

export interface BaseSession {
  id?: string;
  clientUuid: string;
  sportKey: SportKey;
  startedAt: string | Date;
  durationSeconds: number;
  rpe?: number;
  status: SessionStatus;
  notes?: string;
  metrics?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface RunningSession extends BaseSession {
  sportKey: 'running';
  metrics: {
    distanceKm: number;
    type?: 'easy' | 'interval' | 'long' | 'recovery' | 'test' | 'race';
    elevationGainMeters?: number;
    heartRateAvg?: number;
    heartRateMax?: number;
    cadenceAvg?: number;
  };
}

export interface BoxingRound {
  roundNumber: number;
  durationSeconds?: number;
  restSeconds?: number;
  punchesThrown?: number;
  punchesLanded?: number;
  rpe?: number;
}

export interface BoxingSession extends BaseSession {
  sportKey: 'boxing';
  rounds: BoxingRound[];
}

export interface StrengthSet {
  setNumber: number;
  repetitions: number;
  loadKg?: number;
  rpe?: number;
  restSeconds?: number;
}

export interface StrengthExercise {
  name: string;
  targetMuscleGroup?: string;
  loadMode?: 'total_load' | 'per_side_load' | 'bodyweight' | 'assisted';
  sets: StrengthSet[];
}

export interface StrengthSession extends BaseSession {
  sportKey: 'strength';
  exercises: StrengthExercise[];
}

export interface FutevoleiSet {
  setNumber: number;
  pointsFor?: number;
  pointsAgainst?: number;
  won?: boolean;
}

export interface FutevoleiSession extends BaseSession {
  sportKey: 'futevolei';
  sets: FutevoleiSet[];
}

export interface FootballSession extends BaseSession {
  sportKey: 'football';
  metrics: {
    position?: string;
    minutesPlayed: number;
    goals?: number;
    assists?: number;
    matchType?: 'casual' | 'championship' | 'training';
  };
}

export type AnySession =
  | RunningSession
  | BoxingSession
  | StrengthSession
  | FutevoleiSession
  | FootballSession;
