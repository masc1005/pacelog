export type SwimmingEnvironment = 'pool' | 'open_water';

export type SwimmingStroke =
  | 'freestyle'
  | 'backstroke'
  | 'breaststroke'
  | 'butterfly'
  | 'mixed'
  | 'drill'
  | 'other';

export type SwimmingSet = {
  setNumber: number;
  distanceMeters: number;
  repetitions: number;
  stroke: SwimmingStroke;
  durationSeconds?: number;
  restSeconds?: number;
  targetPaceSecondsPer100m?: number;
  averagePaceSecondsPer100m?: number;
  rpe?: number;
  notes?: string;
};

export type SwimmingMetrics = {
  environment: SwimmingEnvironment;
  totalDistanceMeters: number;
  poolLengthMeters?: number;
  totalLaps?: number;
  primaryStroke?: SwimmingStroke;
  paceSecondsPer100m?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  totalStrokes?: number;
  swolf?: number;
  sets?: SwimmingSet[];
};
