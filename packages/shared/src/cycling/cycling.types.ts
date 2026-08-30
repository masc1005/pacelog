export const CYCLING_TYPES = ['road', 'indoor', 'mountain_bike', 'mixed'] as const;
export type CyclingType = (typeof CYCLING_TYPES)[number];

export interface CyclingMetrics {
  cyclingType: CyclingType;
  distanceKm: number;
  durationSeconds: number;
  averageSpeedKmh?: number;
  paceSecondsPerKm?: number;
  elevationGainMeters?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  bikeId?: string;
  notes?: string;
}
