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
  /** @deprecated Use gearId. Mantido para sessões antigas. */
  bikeId?: string;
  /** Bicicleta vinculada. null = nenhuma. */
  gearId?: string | null;
  notes?: string;
}
