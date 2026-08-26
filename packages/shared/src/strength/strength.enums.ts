export const LOAD_UNITS = ['kg', 'lb', 'bodyweight', 'assisted', 'none'] as const;
export type LoadUnit = (typeof LOAD_UNITS)[number];

export const SET_STATUSES = ['planned', 'completed', 'skipped'] as const;
export type SetStatus = (typeof SET_STATUSES)[number];

export const STRENGTH_SET_TYPES = ['working', 'warmup', 'drop', 'failure', 'amrap'] as const;
export type StrengthSetType = (typeof STRENGTH_SET_TYPES)[number];

export const ACTIVE_SESSION_STATUSES = ['active', 'paused', 'finishing'] as const;
export type ActiveSessionStatus = (typeof ACTIVE_SESSION_STATUSES)[number];

export const STRENGTH_SESSION_STATUSES = [
  'planned',
  'active',
  'paused',
  'finishing',
  'completed',
  'cancelled',
  'abandoned',
] as const;
export type StrengthSessionStatus = (typeof STRENGTH_SESSION_STATUSES)[number];
