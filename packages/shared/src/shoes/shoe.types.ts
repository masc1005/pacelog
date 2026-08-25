export type ShoeStatus = 'active' | 'retired' | 'archived';

export type RunningShoe = {
  id: string;
  userId: string;

  brand?: string;
  model: string;
  nickname?: string;
  color?: string;
  imageUrl?: string;

  purchaseDate?: string;
  startedUsingAt?: string;

  initialDistanceKm: number;
  accumulatedDistanceKm: number;
  distanceLimitKm?: number;

  status: ShoeStatus;
  isDefault: boolean;

  createdAt: string;
  updatedAt: string;
};

export type ShoeUsageSummary = {
  totalDistanceKm: number;
  remainingDistanceKm: number | null;
  usagePercent: number | null;
  usageStatus: 'normal' | 'near_limit' | 'over_limit' | 'unlimited';
  runningSessions: number;
  averageDistanceKm: number | null;
  averagePaceSecondsPerKm: number | null;
};
