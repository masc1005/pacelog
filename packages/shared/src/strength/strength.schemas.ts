import { z } from 'zod';
import {
  LOAD_UNITS,
  SET_STATUSES,
  STRENGTH_SET_TYPES,
  ACTIVE_SESSION_STATUSES,
  STRENGTH_SESSION_STATUSES,
} from './strength.enums.js';

// ==========================================
// SÉRIE
// ==========================================

export const strengthSetSchema = z.object({
  id: z.string().uuid(),
  setNumber: z.number().int().positive(),
  status: z.enum(SET_STATUSES),
  type: z.enum(STRENGTH_SET_TYPES).default('working'),

  reps: z.number().int().positive().optional(),
  load: z.number().nonnegative().optional(),
  loadUnit: z.enum(LOAD_UNITS).default('kg'),

  durationSeconds: z.number().positive().optional(),
  restSeconds: z.number().nonnegative().optional(),
  rir: z.number().int().min(0).max(20).optional(),
  rpe: z.number().min(1).max(10).optional(),

  notes: z.string().max(500).optional(),
  completedAt: z.string().datetime().optional(),
});

// ==========================================
// EXERCÍCIO DENTRO DA SESSÃO
// ==========================================

export const strengthExerciseEntrySchema = z.object({
  id: z.string().uuid(),
  exerciseKey: z.string().min(1),
  exerciseNameSnapshot: z.string().min(1).max(200),
  primaryMuscleGroup: z.string().max(100).optional(),
  equipment: z.string().max(100).optional(),
  order: z.number().int().nonnegative(),
  notes: z.string().max(500).optional(),
  sets: z.array(strengthSetSchema).default([]),
});

// ==========================================
// SESSÃO ATIVA
// ==========================================

export const activeStrengthSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  sportKey: z.literal('strength'),
  // Usa STRENGTH_SESSION_STATUSES (não ACTIVE_SESSION_STATUSES) para cobrir
  // também sessões já finalizadas (completed, cancelled, abandoned) ao serializar
  // respostas de /sessions/:id e do histórico.
  status: z.enum(STRENGTH_SESSION_STATUSES),

  startedAt: z.string().datetime(),
  pausedAt: z.string().datetime().optional(),
  totalPausedSeconds: z.number().int().nonnegative().default(0),
  lastActivityAt: z.string().datetime(),

  exercises: z.array(strengthExerciseEntrySchema).default([]),
  notes: z.string().max(1000).optional(),

  clientVersion: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ==========================================
// INPUTS DE API (mutações)
// ==========================================

export const startStrengthSessionSchema = z.object({
  operationId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
  startedAt: z.string().datetime().optional(),
});
export type StartStrengthSessionInput = z.infer<typeof startStrengthSessionSchema>;

export const addExerciseInputSchema = z.object({
  operationId: z.string().uuid(),
  exerciseKey: z.string().min(1),
  exerciseNameSnapshot: z.string().min(1).max(200),
  primaryMuscleGroup: z.string().max(100).optional(),
  equipment: z.string().max(100).optional(),
  order: z.number().int().nonnegative().optional(),
});
export type AddExerciseInput = z.infer<typeof addExerciseInputSchema>;

export const addSetInputSchema = z.object({
  operationId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  type: z.enum(STRENGTH_SET_TYPES).default('working'),
  reps: z.number().int().positive().optional(),
  load: z.number().nonnegative().optional(),
  loadUnit: z.enum(LOAD_UNITS).default('kg'),
  restSeconds: z.number().nonnegative().optional(),
  rir: z.number().int().min(0).max(20).optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().max(500).optional(),
});
export type AddSetInput = z.infer<typeof addSetInputSchema>;

export const completeSetInputSchema = z.object({
  operationId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  setId: z.string().uuid(),
  reps: z.number().int().positive().optional(),
  load: z.number().nonnegative().optional(),
  loadUnit: z.enum(LOAD_UNITS).optional(),
  rpe: z.number().min(1).max(10).optional(),
  rir: z.number().int().min(0).max(20).optional(),
  notes: z.string().max(500).optional(),
});
export type CompleteSetInput = z.infer<typeof completeSetInputSchema>;

export const editSetInputSchema = z.object({
  reps: z.number().int().positive().optional(),
  load: z.number().nonnegative().optional(),
  loadUnit: z.enum(LOAD_UNITS).optional(),
  type: z.enum(STRENGTH_SET_TYPES).optional(),
  rpe: z.number().min(1).max(10).optional(),
  rir: z.number().int().min(0).max(20).optional(),
  restSeconds: z.number().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});
export type EditSetInput = z.infer<typeof editSetInputSchema>;

export const finishSessionInputSchema = z.object({
  operationId: z.string().uuid().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(1000).optional(),
  finishedAt: z.string().datetime().optional(),
});
export type FinishSessionInput = z.infer<typeof finishSessionInputSchema>;

/**
 * ATENÇÃO: se `clientVersion` for enviado e diferir da versão atual no servidor,
 * o endpoint lança `STRENGTH_SESSION_VERSION_CONFLICT` (409).
 * Use para detectar edições concorrentes entre dispositivos.
 * Omita se não quiser verificação de versão.
 */
export const patchSessionInputSchema = z.object({
  notes: z.string().max(1000).optional(),
  clientVersion: z.number().int().nonnegative().optional(),
  startedAt: z.string().datetime().optional(),
});
export type PatchSessionInput = z.infer<typeof patchSessionInputSchema>;
