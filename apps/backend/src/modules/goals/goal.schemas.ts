import { z } from 'zod';
import {
  SPORT_KEYS,
  GOAL_SCOPES,
  GOAL_METRIC_TYPES,
  GOAL_DIRECTIONS,
  GOAL_TYPES,
  GOAL_PERIODS,
  GOAL_STATUSES,
} from '@pacelog/shared';

export const createGoalSchema = z.object({
  title: z.string().max(120).optional(),
  scope: z.enum(GOAL_SCOPES).default('sport'),
  sportKey: z.enum(SPORT_KEYS).nullable().optional(),
  metricType: z.enum(GOAL_METRIC_TYPES).optional(),
  type: z.enum(GOAL_TYPES).optional(),
  direction: z.enum(GOAL_DIRECTIONS).default('increase'),
  targetValue: z.number().positive('Alvo deve ser um número positivo'),
  startValue: z.number().optional().nullable(),
  unit: z.string().min(1).optional(),
  period: z.enum(GOAL_PERIODS).default('weekly'),
  startDate: z.coerce.date().default(() => new Date()),
  deadline: z.coerce.date().nullable().optional(),
  notes: z.string().max(500).optional().nullable(),
  clientUuid: z.string().optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  targetValue: z.number().positive().optional(),
  unit: z.string().min(1).optional(),
  status: z.enum(GOAL_STATUSES).optional(),
  deadline: z.coerce.date().nullable().optional(),
  notes: z.string().max(500).optional().nullable(),
  celebrationShown: z.boolean().optional(),
});

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const listGoalsQuerySchema = z.object({
  status: z.enum(GOAL_STATUSES).optional(),
  sportKey: z.enum(SPORT_KEYS).optional(),
  scope: z.enum(GOAL_SCOPES).optional(),
  period: z.enum(GOAL_PERIODS).optional(),
});

export type ListGoalsQuery = z.infer<typeof listGoalsQuerySchema>;

