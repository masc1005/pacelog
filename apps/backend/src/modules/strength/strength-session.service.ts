import { randomUUID } from 'crypto';
import { ActiveStrengthSessionModel } from './strength-session.model.js';
import { strengthSessionRepository } from './strength-session.repository.js';
import { computeFinalMetrics } from './strength-session.metrics.js';
import {
  StrengthSessionNotActiveError,
  StrengthExerciseNotFoundError,
  StrengthSetNotFoundError,
  StrengthSessionNoExercisesError,
  StrengthSessionVersionConflictError,
} from './strength-session.errors.js';
import type {
  StartStrengthSessionInput,
  AddExerciseInput,
  AddSetInput,
  CompleteSetInput,
  EditSetInput,
  FinishSessionInput,
  PatchSessionInput,
} from '@pacelog/shared';
import type { IActiveStrengthSessionDocument } from './strength-session.model.js';
import type { ListStrengthSessionsQuery } from './strength-session.schemas.js';

const repo = strengthSessionRepository;

export class StrengthSessionService {
  // ==========================================
  // INICIAR SESSÃO
  // ==========================================

  async startSession(
    userId: string,
    input: StartStrengthSessionInput
  ): Promise<IActiveStrengthSessionDocument> {
    await repo.assertNoActiveSession(userId);

    const session = await ActiveStrengthSessionModel.create({
      userId,
      sportKey: 'strength',
      status: 'active',
      startedAt: input.startedAt ? new Date(input.startedAt) : new Date(),
      lastActivityAt: new Date(),
      totalPausedSeconds: 0,
      exercises: [],
      notes: input.notes,
      clientVersion: 0,
      processedOperationIds: input.operationId ? [input.operationId] : [],
    });

    return session;
  }

  // ==========================================
  // SESSÃO ATIVA
  // ==========================================

  async getActiveSession(
    userId: string
  ): Promise<IActiveStrengthSessionDocument | null> {
    return repo.findActive(userId);
  }

  async getSessionById(
    userId: string,
    sessionId: string
  ): Promise<IActiveStrengthSessionDocument> {
    return repo.findByIdOrFail(userId, sessionId);
  }

  async listCompletedSessions(userId: string, query: ListStrengthSessionsQuery) {
    return repo.listCompleted(userId, query.page, query.limit);
  }

  // ==========================================
  // PAUSAR / RETOMAR
  // ==========================================

  async pauseSession(
    userId: string,
    sessionId: string
  ): Promise<IActiveStrengthSessionDocument> {
    const session = await repo.findByIdOrFail(userId, sessionId);

    if (session.status !== 'active') {
      throw new StrengthSessionNotActiveError(session.status);
    }

    session.status = 'paused';
    session.pausedAt = new Date();
    session.lastActivityAt = new Date();

    return session.save();
  }

  async resumeSession(
    userId: string,
    sessionId: string
  ): Promise<IActiveStrengthSessionDocument> {
    const session = await repo.findByIdOrFail(userId, sessionId);

    if (session.status !== 'paused') {
      throw new StrengthSessionNotActiveError(session.status);
    }

    const pausedAt = session.pausedAt;
    if (pausedAt) {
      const pausedSeconds = Math.round(
        (Date.now() - pausedAt.getTime()) / 1000
      );
      session.totalPausedSeconds += pausedSeconds;
      session.pausedAt = undefined;
    }

    session.status = 'active';
    session.lastActivityAt = new Date();

    return session.save();
  }

  // ==========================================
  // EXERCÍCIOS
  // ==========================================

  async addExercise(
    userId: string,
    sessionId: string,
    input: AddExerciseInput
  ): Promise<IActiveStrengthSessionDocument> {
    const session = await repo.findByIdOrFail(userId, sessionId);
    this.assertIsEditable(session);

    // Idempotência
    if (repo.isOperationProcessed(session, input.operationId)) {
      return session;
    }

    const order = input.order ?? session.exercises.length;

    session.exercises.push({
      id: randomUUID(),
      exerciseKey: input.exerciseKey,
      exerciseNameSnapshot: input.exerciseNameSnapshot,
      primaryMuscleGroup: input.primaryMuscleGroup,
      equipment: input.equipment,
      order,
      sets: [],
    });

    // Reordenar para garantir consistência
    session.exercises.sort((a, b) => a.order - b.order);
    session.clientVersion += 1;

    return repo.markOperationAndSave(session, input.operationId);
  }

  async removeExercise(
    userId: string,
    sessionId: string,
    exerciseId: string
  ): Promise<IActiveStrengthSessionDocument> {
    const session = await repo.findByIdOrFail(userId, sessionId);
    this.assertIsEditable(session);

    const index = session.exercises.findIndex((e) => e.id === exerciseId);
    if (index === -1) throw new StrengthExerciseNotFoundError(exerciseId);

    session.exercises.splice(index, 1);
    // Reindexar ordem
    session.exercises.forEach((e, i) => (e.order = i));
    session.clientVersion += 1;
    session.lastActivityAt = new Date();

    return session.save();
  }

  // ==========================================
  // SÉRIES
  // ==========================================

  async addSet(
    userId: string,
    sessionId: string,
    input: AddSetInput
  ): Promise<IActiveStrengthSessionDocument> {
    const session = await repo.findByIdOrFail(userId, sessionId);
    this.assertIsEditable(session);

    if (repo.isOperationProcessed(session, input.operationId)) {
      return session;
    }

    const exercise = session.exercises.find((e) => e.id === input.exerciseId);
    if (!exercise) throw new StrengthExerciseNotFoundError(input.exerciseId);

    const setNumber = exercise.sets.length + 1;

    exercise.sets.push({
      id: randomUUID(),
      setNumber,
      status: 'planned',
      type: input.type ?? 'working',
      reps: input.reps,
      load: input.load,
      loadUnit: input.loadUnit ?? 'kg',
      restSeconds: input.restSeconds,
      rir: input.rir,
      rpe: input.rpe,
      notes: input.notes,
    });

    session.clientVersion += 1;

    return repo.markOperationAndSave(session, input.operationId);
  }

  async completeSet(
    userId: string,
    sessionId: string,
    input: CompleteSetInput
  ): Promise<IActiveStrengthSessionDocument> {
    const session = await repo.findByIdOrFail(userId, sessionId);
    this.assertIsEditable(session);

    if (repo.isOperationProcessed(session, input.operationId)) {
      return session;
    }

    const exercise = session.exercises.find((e) => e.id === input.exerciseId);
    if (!exercise) throw new StrengthExerciseNotFoundError(input.exerciseId);

    const set = exercise.sets.find((s) => s.id === input.setId);
    if (!set) throw new StrengthSetNotFoundError(input.setId);

    set.status = 'completed';
    set.completedAt = new Date();
    if (input.reps != null) set.reps = input.reps;
    if (input.load != null) set.load = input.load;
    if (input.loadUnit) set.loadUnit = input.loadUnit;
    if (input.rpe != null) set.rpe = input.rpe;
    if (input.rir != null) set.rir = input.rir;
    if (input.notes != null) set.notes = input.notes;

    session.clientVersion += 1;

    return repo.markOperationAndSave(session, input.operationId);
  }

  async editSet(
    userId: string,
    sessionId: string,
    exerciseId: string,
    setId: string,
    input: EditSetInput
  ): Promise<IActiveStrengthSessionDocument> {
    const session = await repo.findByIdOrFail(userId, sessionId);
    this.assertIsEditable(session);

    const exercise = session.exercises.find((e) => e.id === exerciseId);
    if (!exercise) throw new StrengthExerciseNotFoundError(exerciseId);

    const set = exercise.sets.find((s) => s.id === setId);
    if (!set) throw new StrengthSetNotFoundError(setId);

    if (input.reps != null) set.reps = input.reps;
    if (input.load != null) set.load = input.load;
    if (input.loadUnit) set.loadUnit = input.loadUnit;
    if (input.type) set.type = input.type;
    if (input.rpe != null) set.rpe = input.rpe;
    if (input.rir != null) set.rir = input.rir;
    if (input.restSeconds != null) set.restSeconds = input.restSeconds;
    if (input.notes != null) set.notes = input.notes;

    session.clientVersion += 1;
    session.lastActivityAt = new Date();

    return session.save();
  }

  async removeSet(
    userId: string,
    sessionId: string,
    exerciseId: string,
    setId: string
  ): Promise<IActiveStrengthSessionDocument> {
    const session = await repo.findByIdOrFail(userId, sessionId);
    this.assertIsEditable(session);

    const exercise = session.exercises.find((e) => e.id === exerciseId);
    if (!exercise) throw new StrengthExerciseNotFoundError(exerciseId);

    const index = exercise.sets.findIndex((s) => s.id === setId);
    if (index === -1) throw new StrengthSetNotFoundError(setId);

    exercise.sets.splice(index, 1);
    // Renumerar séries
    exercise.sets.forEach((s, i) => (s.setNumber = i + 1));

    session.clientVersion += 1;
    session.lastActivityAt = new Date();

    return session.save();
  }

  // ==========================================
  // FINALIZAR
  // ==========================================

  async finishSession(
    userId: string,
    sessionId: string,
    input: FinishSessionInput
  ): Promise<IActiveStrengthSessionDocument> {
    const session = await repo.findByIdOrFail(userId, sessionId);

    if (session.status === 'completed') {
      return session; // Idempotente
    }

    if (!['active', 'paused', 'finishing'].includes(session.status)) {
      throw new StrengthSessionNotActiveError(session.status);
    }

    if (session.exercises.length === 0) {
      throw new StrengthSessionNoExercisesError();
    }

    const finishedAt = input.finishedAt
      ? new Date(input.finishedAt)
      : new Date();

    // Recalcular métricas no backend (não confiar no cliente)
    const metrics = computeFinalMetrics(session, finishedAt);

    session.status = 'completed';
    session.finishedAt = finishedAt;
    session.durationSeconds = metrics.durationSeconds;
    session.totalPausedSeconds = metrics.totalPausedSeconds;
    session.totalSets = metrics.totalSets;
    session.completedSets = metrics.completedSets;
    session.totalReps = metrics.totalReps;
    session.totalVolumeKg = metrics.totalVolumeKg;
    if (metrics.estimatedOneRepMax != null) {
      session.estimatedOneRepMax = metrics.estimatedOneRepMax;
    }
    if (input.notes != null) session.notes = input.notes;
    session.lastActivityAt = new Date();

    return session.save();
  }

  async cancelSession(
    userId: string,
    sessionId: string
  ): Promise<IActiveStrengthSessionDocument> {
    const session = await repo.findByIdOrFail(userId, sessionId);

    if (!['active', 'paused', 'finishing'].includes(session.status)) {
      throw new StrengthSessionNotActiveError(session.status);
    }

    session.status = 'cancelled';
    session.lastActivityAt = new Date();

    return session.save();
  }

  async patchSession(
    userId: string,
    sessionId: string,
    input: PatchSessionInput
  ): Promise<IActiveStrengthSessionDocument> {
    const session = await repo.findByIdOrFail(userId, sessionId);
    this.assertIsEditable(session);

    // Detecção de conflito de versão (se o cliente enviar)
    if (
      input.clientVersion != null &&
      input.clientVersion !== session.clientVersion
    ) {
      throw new StrengthSessionVersionConflictError(session.clientVersion);
    }

    if (input.notes != null) session.notes = input.notes;
    session.lastActivityAt = new Date();

    return session.save();
  }

  // ==========================================
  // HELPERS PRIVADOS
  // ==========================================

  private assertIsEditable(session: IActiveStrengthSessionDocument): void {
    if (!['active', 'paused', 'finishing'].includes(session.status)) {
      throw new StrengthSessionNotActiveError(session.status);
    }
  }
}

export const strengthSessionService = new StrengthSessionService();
