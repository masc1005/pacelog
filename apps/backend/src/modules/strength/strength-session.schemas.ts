import { z } from 'zod';
import {
  startStrengthSessionSchema,
  addExerciseInputSchema,
  addSetInputSchema,
  completeSetInputSchema,
  editSetInputSchema,
  finishSessionInputSchema,
  patchSessionInputSchema,
} from '@pacelog/shared';

// Re-export dos schemas compartilhados para uso nas rotas do backend
export {
  startStrengthSessionSchema,
  addExerciseInputSchema,
  addSetInputSchema,
  completeSetInputSchema,
  editSetInputSchema,
  finishSessionInputSchema,
  patchSessionInputSchema,
};

// Schemas específicos da API de backend (adiciona validações extras quando necessário)

export const listStrengthSessionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListStrengthSessionsQuery = z.infer<typeof listStrengthSessionsQuerySchema>;

export const exerciseSearchQuerySchema = z.object({
  query: z.string().max(200).optional(),
  muscleGroup: z.string().optional(),
  equipment: z.string().optional(),
  type: z.string().optional(),
  recent: z.coerce.boolean().optional(),
  favorites: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type ExerciseSearchQuery = z.infer<typeof exerciseSearchQuerySchema>;

export const createCustomExerciseSchema = z.object({
  name: z.string().min(1).max(200),
  primaryMuscleGroup: z.string().min(1).max(100),
  secondaryMuscleGroups: z.array(z.string().max(100)).optional(),
  equipment: z.string().min(1).max(100),
  type: z.enum(['compound', 'isolation', 'cardio', 'mobility', 'other']).optional(),
});
export type CreateCustomExerciseInput = z.infer<typeof createCustomExerciseSchema>;

export const reorderExercisesInputSchema = z.object({
  /** Array de IDs de exercícios na nova ordem desejada. Deve conter todos os IDs presentes na sessão. */
  orderedIds: z.array(z.string().uuid()).min(1),
});
export type ReorderExercisesInput = z.infer<typeof reorderExercisesInputSchema>;
