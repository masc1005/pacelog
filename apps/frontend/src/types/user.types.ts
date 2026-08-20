import { SportKey } from './sport.types.js';

export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  unitSystem: 'metric' | 'imperial';
  timezone: string;
  firstDayOfWeek: 0 | 1;
  theme: 'dark' | 'light' | 'system';
  weeklySessionGoal?: number;
  streakEnabled: boolean;
  aiInsightsEnabled: boolean;
  activeSports: SportKey[];
  onboardingCompletedAt?: string;
}
