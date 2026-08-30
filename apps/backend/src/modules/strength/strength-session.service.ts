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
import { reorderExercises } from '@pacelog/shared';
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

  async reorderExercises(
    userId: string,
    sessionId: string,
    orderedIds: string[]
  ): Promise<IActiveStrengthSessionDocument> {
    const session = await repo.findByIdOrFail(userId, sessionId);
    this.assertIsEditable(session);

    // Valida que orderedIds contém exatamente os IDs presentes na sessão
    const existingIds = new Set(session.exercises.map((e) => e.id));
    const hasAll = orderedIds.length === existingIds.size && orderedIds.every((id) => existingIds.has(id));
    if (!hasAll) {
      throw new StrengthExerciseNotFoundError(
        orderedIds.find((id) => !existingIds.has(id)) ?? 'unknown'
      );
    }

    session.exercises = reorderExercises(session.exercises as any, orderedIds) as any;
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
      await this.syncToMainSessions(session, input.rpe);
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

    const savedSession = await session.save();

    // Sincroniza com a coleção principal (SessionModel) para aparecer no Diário (/sessions),
    // Dashboard (/), Progresso (ACWR), Metas e Alertas.
    await this.syncToMainSessions(savedSession, input.rpe);

    return savedSession;
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

    const saved = await session.save();

    // Se houver registro sincronizado no SessionModel, remove
    try {
      const { SessionModel } = await import('../sessions/session.model.js');
      await SessionModel.deleteOne({ _id: sessionId, userId });
    } catch {
      // Silencioso se não existir
    }

    return saved;
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
  // SINCRONIZAÇÃO COM SESSÕES PRINCIPAIS
  // ==========================================

  async syncToMainSessions(
    session: IActiveStrengthSessionDocument,
    customRpe?: number
  ): Promise<void> {
    try {
      const { SessionModel } = await import('../sessions/session.model.js');
      const { buildSessionLoad } = await import('../progress/load/load.service.js');
      const { notificationService } = await import('../notifications/notification.service.js');
      const { progressService } = await import('../progress/progress.service.js');

      const rpe = customRpe ?? this.calculateAverageRpe(session) ?? 6;
      const durationSeconds = session.durationSeconds || 60;
      const loadPayload = buildSessionLoad(rpe, durationSeconds, 'completed');

      const mappedExercises = (session.exercises || []).map((e) => ({
        exerciseName: e.exerciseNameSnapshot,
        targetMuscleGroup: e.primaryMuscleGroup,
        sets: (e.sets || []).map((s) => ({
          setNumber: s.setNumber,
          reps: s.reps ?? 0,
          weightKg: s.load ?? 0,
          rpe: s.rpe,
          isWarmup: s.type === 'warmup',
        })),
      }));

      await SessionModel.findOneAndUpdate(
        { _id: session._id, userId: session.userId },
        {
          $set: {
            userId: session.userId,
            sportKey: 'strength',
            startedAt: session.startedAt,
            endedAt: session.finishedAt || session.startedAt,
            durationSeconds,
            rpe,
            sessionalLoad: loadPayload.sessionalLoad ?? 0,
            load: loadPayload.load,
            status: 'completed',
            metrics: {
              totalVolumeKg: session.totalVolumeKg ?? 0,
              totalSets: session.totalSets ?? 0,
              completedSets: session.completedSets ?? 0,
              totalReps: session.totalReps ?? 0,
              estimatedOneRepMax: session.estimatedOneRepMax,
              exercises: mappedExercises,
            },
            notes: session.notes,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Dispara alertas assíncronos (Metas, ACWR)
      setImmediate(async () => {
        try {
          await notificationService.checkAndDispatchGoalAlerts(session.userId);
          const overview = await progressService.getOverview(session.userId);
          await notificationService.checkAndDispatchAcwrAlerts(session.userId, overview.acwr);
        } catch (err) {
          console.error('[StrengthSessionService] Error dispatching alerts:', err);
        }
      });
    } catch (err) {
      console.error('[StrengthSessionService] Erro ao sincronizar para SessionModel:', err);
    }
  }

  calculateAverageRpe(session: IActiveStrengthSessionDocument): number | null {
    const rpes: number[] = [];
    for (const ex of session.exercises || []) {
      for (const set of ex.sets || []) {
        if (set.status === 'completed' && set.rpe != null && set.rpe >= 1 && set.rpe <= 10) {
          rpes.push(set.rpe);
        }
      }
    }
    if (rpes.length === 0) return null;
    const avg = rpes.reduce((a, b) => a + b, 0) / rpes.length;
    return Math.max(1, Math.min(10, Math.round(avg)));
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

/**
 * Garante que todas as sessões de musculação com status 'completed'
 * existentes em ActiveStrengthSessionModel estejam sincronizadas em SessionModel.
 */
export async function syncCompletedStrengthSessions(): Promise<void> {
  try {
    const completedSessions = await ActiveStrengthSessionModel.find({ status: 'completed' });
    for (const session of completedSessions) {
      await strengthSessionService.syncToMainSessions(session);
    }
  } catch (err) {
    console.error('[StrengthSessionService] Erro ao sincronizar sessões de musculação na inicialização:', err);
  }
}
