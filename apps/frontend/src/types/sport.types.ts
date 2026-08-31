import { SportKey } from '@pacelog/shared';

export type { SportKey };

export interface SportConfig {
  key: SportKey;
  name: string;
  category: 'endurance' | 'combat' | 'team' | 'strength' | 'individual';
  icon: string;
  primaryMetric: string;
  color: string;
  defaultMetrics: string[];
}

export const SPORTS_REGISTRY: Record<SportKey, SportConfig> = {
  running: {
    key: 'running',
    name: 'Corrida',
    category: 'endurance',
    icon: 'directions_run',
    primaryMetric: 'distanceKm',
    color: '#39ff14',
    defaultMetrics: ['distanceKm', 'pace', 'elevationGainMeters', 'heartRateAvg'],
  },
  boxing: {
    key: 'boxing',
    name: 'Boxe',
    category: 'combat',
    icon: 'sports_mma',
    primaryMetric: 'rounds',
    color: '#ff3b30',
    defaultMetrics: ['roundsCount', 'roundDurationSeconds', 'rpe'],
  },
  strength: {
    key: 'strength',
    name: 'Musculação',
    category: 'strength',
    icon: 'fitness_center',
    primaryMetric: 'totalVolumeKg',
    color: '#ffb800',
    defaultMetrics: ['exercisesCount', 'setsCount', 'totalVolumeKg'],
  },
  futevolei: {
    key: 'futevolei',
    name: 'Futevôlei',
    category: 'team',
    icon: 'sports_volleyball',
    primaryMetric: 'setsWon',
    color: '#00e5ff',
    defaultMetrics: ['setsCount', 'scoreFor', 'scoreAgainst'],
  },
  football: {
    key: 'football',
    name: 'Futebol',
    category: 'team',
    icon: 'sports_soccer',
    primaryMetric: 'minutesPlayed',
    color: '#00ff88',
    defaultMetrics: ['minutesPlayed', 'goals', 'assists'],
  },
  swimming: {
    key: 'swimming',
    name: 'Natação',
    category: 'individual',
    icon: 'pool',
    primaryMetric: 'paceSecondsPer100m',
    color: '#38BDF8',
    defaultMetrics: ['totalDistanceMeters', 'durationSeconds', 'paceSecondsPer100m'],
  },
  cycling: {
    key: 'cycling',
    name: 'Ciclismo',
    category: 'individual',
    icon: 'directions_bike',
    primaryMetric: 'averageSpeedKmh',
    color: '#10B981',
    defaultMetrics: ['distanceKm', 'durationSeconds', 'averageSpeedKmh', 'cyclingType'],
  },
  jiujitsu: {
    key: 'jiujitsu',
    name: 'Jiu-Jitsu',
    category: 'combat',
    icon: 'shield',
    primaryMetric: 'roundsCount',
    color: '#E11D48',
    defaultMetrics: ['trainingType', 'gi', 'beltRank', 'roundsCount', 'submissionsLanded'],
  },
};
