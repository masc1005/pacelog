export type JiuJitsuTrainingType =
  | 'technique'
  | 'sparring'
  | 'competition'
  | 'drilling'
  | 'seminar';

export type BeltRank =
  | 'white'
  | 'blue'
  | 'purple'
  | 'brown'
  | 'black';

export interface JiuJitsuMetrics {
  trainingType: JiuJitsuTrainingType;
  durationSeconds?: number;
  beltRank?: BeltRank;
  beltDegree?: number;
  roundsCount?: number;
  averageRoundDurationSeconds?: number;
  submissionsLanded?: number;
  submissionsReceived?: number;
  techniquesFocus?: string[];
  gi?: boolean;
  notes?: string;
}

export interface AthleteJiuJitsuProfile {
  currentBelt?: BeltRank;
  currentDegree?: number;
  beltAwardedAt?: string;
  academy?: string;
  primaryStyle?: 'gi' | 'no_gi' | 'both';
}
