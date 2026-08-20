import { SportKey } from './sport.types.js';

export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived';
export type GoalDirection = 'increase' | 'decrease' | 'maintain' | 'complete';

export interface Goal {
  id: string;
  sportKey?: SportKey;
  name: string;
  metricKey: string;
  initialValue: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  direction: GoalDirection;
  status: GoalStatus;
  startsAt: string;
  endsAt?: string;
  progressPercent: number;
  createdAt: string;
}
