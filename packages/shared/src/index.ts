export const SPORT_KEYS = [
  'running',
  'football',
  'futevolei',
  'boxing',
  'strength',
] as const;

export type SportKey = (typeof SPORT_KEYS)[number];

export interface BaseEntity {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
