import { SportKey } from './sport.types.js';

export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  bio?: string;
  currentWeightKg?: number;
  heightCm?: number;
  biologicalSex?: 'male' | 'female';
  birthDate?: string;
  avatarUrl?: string;
  unitSystem: 'metric' | 'imperial';
  timezone: string;
  firstDayOfWeek: 0 | 1;
  theme: 'dark' | 'light' | 'system';
  weeklySessionGoal?: number;
  streakEnabled: boolean;
  aiInsightsEnabled: boolean;
  activeSports: SportKey[];
  primarySportKey?: SportKey;
  onboardingCompletedAt?: string;
}
