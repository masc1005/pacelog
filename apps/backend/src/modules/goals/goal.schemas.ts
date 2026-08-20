import { z } from 'zod';
import {
  SPORT_KEYS,
  GOAL_TYPES,
  GOAL_PERIODS,
  GOAL_STATUSES,
} from '@pacelog/shared';

export const createGoalSchema = z.object({
  title: z.string().min(2, 'Título deve ter ao menos 2 caracteres').max(120),
  type: z.enum(GOAL_TYPES),
  sportKey: z.enum(SPORT_KEYS).nullable().optional(),
  targetValue: z.number().positive('Alvo deve ser um número positivo'),
  unit: z.string().min(1).default('sessions'),
  period: z.enum(GOAL_PERIODS).default('weekly'),
  startDate: z.coerce.date().default(() => new Date()),
  deadline: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  targetValue: z.number().positive().optional(),
  unit: z.string().min(1).optional(),
  status: z.enum(GOAL_STATUSES).optional(),
  deadline: z.coerce.date().nullable().optional(),
  notes: z.string().max(500).optional(),
});

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const listGoalsQuerySchema = z.object({
  status: z.enum(GOAL_STATUSES).optional(),
  sportKey: z.enum(SPORT_KEYS).optional(),
  period: z.enum(GOAL_PERIODS).optional(),
});

export type ListGoalsQuery = z.infer<typeof listGoalsQuerySchema>;
