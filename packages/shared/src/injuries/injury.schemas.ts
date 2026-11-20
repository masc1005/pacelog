import { z } from 'zod';
import {
  INJURY_CATEGORIES,
  INJURY_SIDES,
  INJURY_STATUSES,
  INJURY_REGIONS,
} from './injury.types.js';

export const CreateInjuryInputSchema = z.object({
  region: z.union([z.enum(INJURY_REGIONS), z.string().min(1).max(80)]),
  side: z.enum(INJURY_SIDES),
  severity: z.number().int().min(1).max(10),
  category: z.enum(INJURY_CATEGORIES),
  notes: z.string().max(300).optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
});

export const UpdateInjuryInputSchema = z.object({
  severity: z.number().int().min(1).max(10).optional(),
  status: z.enum(INJURY_STATUSES).optional(),
  notes: z.string().max(300).optional(),
  resolvedAt: z.string().datetime({ offset: true }).nullable().optional(),
});
