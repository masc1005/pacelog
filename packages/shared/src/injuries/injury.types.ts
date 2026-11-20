import type { z } from 'zod';
import type {
  CreateInjuryInputSchema,
  UpdateInjuryInputSchema,
} from './injury.schemas.js';

export const INJURY_SIDES = ['left', 'right', 'bilateral', 'center'] as const;
export type InjurySide = (typeof INJURY_SIDES)[number];

export const INJURY_STATUSES = ['active', 'recovering', 'resolved'] as const;
export type InjuryStatus = (typeof INJURY_STATUSES)[number];

export const INJURY_CATEGORIES = [
  'soreness_doms',
  'tendon_overload',
  'joint_discomfort',
  'strain_or_pull',
  'other',
] as const;
export type InjuryCategory = (typeof INJURY_CATEGORIES)[number];

export const INJURY_REGIONS = [
  'ombro',
  'cotovelo',
  'punho',
  'lombar',
  'quadril',
  'joelho',
  'tornozelo',
  'panturrilha',
  'posterior_de_coxa',
  'quadriceps',
  'peitoral',
  'costas_dorsal',
  'trapezio',
  'cervical',
] as const;
export type InjuryRegion = (typeof INJURY_REGIONS)[number];

export interface InjuryHistoryPoint {
  severity: number;
  status: InjuryStatus;
  recordedAt: string;
  notes?: string;
}

export interface InjuryDTO {
  id: string;
  region: string;
  side: InjurySide;
  severity: number;
  category: InjuryCategory;
  status: InjuryStatus;
  notes?: string;
  occurredAt: string;
  resolvedAt?: string | null;
  history: InjuryHistoryPoint[];
  createdAt: string;
  updatedAt: string;
}

export type CreateInjuryInput = z.infer<typeof CreateInjuryInputSchema>;
export type UpdateInjuryInput = z.infer<typeof UpdateInjuryInputSchema>;
