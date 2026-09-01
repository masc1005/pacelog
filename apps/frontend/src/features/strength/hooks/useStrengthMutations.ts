import { useCallback, useRef, useEffect } from 'react';
import { randomUUID } from '../../../lib/utils';
import { strengthApi } from '../../../services/strength.api';
import { ApiError } from '../../../lib/api';
import { enqueueOperation } from '../../../pwa/services/syncQueue.service';
import {
  patchSetLocally,
  addSetLocally,
  removeSetLocally,
  addExerciseLocally,
  removeExerciseLocally,
  patchSessionStatusLocally,
} from '../utils/strengthOptimistic.utils';
import type {
  ActiveStrengthSession,
  AddExerciseInput,
  AddSetInput,
  CompleteSetInput,
  EditSetInput,
  FinishSessionInput,
  StrengthExerciseEntry,
  StrengthSet,
} from '@pacelog/shared';

type SessionUpdater =
  | ActiveStrengthSession
  | null
  | ((prev: ActiveStrengthSession | null) => ActiveStrengthSession | null);

/**
 * Hook de mutações otimistas da sessão ativa de musculação.
 * - Atualiza o estado da UI instantaneamente (<16ms)
 * - Sincroniza em segundo plano com o backend
 * - Em caso de erro na requisição, executa rollback para o estado anterior
 * - Mantém idempotência com operationId e suporte offline para finalização
 */
export function useStrengthMutations(
  sessionId: string | null,
  onUpdate: (updater: SessionUpdater) => void,
  onError?: (err: Error) => void,
  userId?: string | null,
  currentSession?: ActiveStrengthSession | null
) {
  const sessionRef = useRef<ActiveStrengthSession | null>(currentSession ?? null);

  useEffect(() => {
    sessionRef.current = currentSession ?? null;
  }, [currentSession]);

  const pause = useCallback(async () => {
    if (!sessionId) return;
    const previous = sessionRef.current;

    // 1. Atualização otimista imediata
    if (previous) {
      onUpdate((prev) => (prev ? patchSessionStatusLocally(prev, 'paused') : prev));
    }

    // 2. Sincronização em segundo plano
    try {
      const updated = await strengthApi.pauseSession(sessionId);
      onUpdate(updated);
    } catch (err) {
      if (previous) onUpdate(previous);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [sessionId, onUpdate, onError]);

  const resume = useCallback(async () => {
    if (!sessionId) return;
    const previous = sessionRef.current;

    // 1. Atualização otimista imediata
    if (previous) {
      onUpdate((prev) => (prev ? patchSessionStatusLocally(prev, 'active') : prev));
    }

    // 2. Sincronização em segundo plano
    try {
      const updated = await strengthApi.resumeSession(sessionId);
      onUpdate(updated);
    } catch (err) {
      if (previous) onUpdate(previous);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [sessionId, onUpdate, onError]);

  const addExercise = useCallback(
    async (input: Omit<AddExerciseInput, 'operationId'>) => {
      if (!sessionId) return;
      const previous = sessionRef.current;
      const operationId = randomUUID();
      const tempId = `temp_ex_${operationId}`;

      // 1. Atualização otimista imediata
      const optimisticExercise: StrengthExerciseEntry = {
        id: tempId,
        exerciseKey: input.exerciseKey,
        exerciseNameSnapshot: input.exerciseNameSnapshot,
        primaryMuscleGroup: input.primaryMuscleGroup,
        equipment: input.equipment,
        order: previous ? previous.exercises.length : 0,
        sets: [],
      };

      onUpdate((prev) => (prev ? addExerciseLocally(prev, optimisticExercise) : prev));

      // 2. Sincronização em segundo plano
      try {
        const updated = await strengthApi.addExercise(sessionId, {
          ...input,
          operationId,
        });
        onUpdate(updated);
      } catch (err) {
        if (previous) onUpdate(previous);
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [sessionId, onUpdate, onError]
  );

  const removeExercise = useCallback(
    async (exerciseId: string) => {
      if (!sessionId) return;
      const previous = sessionRef.current;

      // 1. Atualização otimista imediata
      onUpdate((prev) => (prev ? removeExerciseLocally(prev, exerciseId) : prev));

      // 2. Sincronização em segundo plano
      try {
        const updated = await strengthApi.removeExercise(sessionId, exerciseId);
        onUpdate(updated);
      } catch (err) {
        if (previous) onUpdate(previous);
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [sessionId, onUpdate, onError]
  );

  const addSet = useCallback(
    async (input: Omit<AddSetInput, 'operationId'>) => {
      if (!sessionId) return;
      const previous = sessionRef.current;
      const operationId = randomUUID();
      const tempId = `temp_set_${operationId}`;

      const targetExercise = previous?.exercises.find((e) => e.id === input.exerciseId);
      const nextSetNumber = (targetExercise?.sets.length ?? 0) + 1;

      const optimisticSet: StrengthSet = {
        id: tempId,
        setNumber: nextSetNumber,
        status: 'planned',
        type: input.type ?? 'working',
        reps: input.reps,
        load: input.load,
        loadUnit: input.loadUnit ?? 'kg',
        restSeconds: input.restSeconds,
        rir: input.rir,
        rpe: input.rpe,
      };

      // 1. Atualização otimista imediata
      onUpdate((prev) => (prev ? addSetLocally(prev, input.exerciseId, optimisticSet) : prev));

      // 2. Sincronização em segundo plano
      try {
        const updated = await strengthApi.addSet(sessionId, {
          ...input,
          operationId,
        });
        onUpdate(updated);
      } catch (err) {
        if (previous) onUpdate(previous);
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [sessionId, onUpdate, onError]
  );

  const completeSet = useCallback(
    async (input: Omit<CompleteSetInput, 'operationId'>) => {
      if (!sessionId) return;
      const previous = sessionRef.current;
      const operationId = randomUUID();

      // 1. Atualização otimista imediata
      onUpdate((prev) =>
        prev
          ? patchSetLocally(prev, input.exerciseId, input.setId, {
              status: 'completed',
              reps: input.reps,
              load: input.load,
              rpe: input.rpe,
              rir: input.rir,
              completedAt: new Date().toISOString(),
            })
          : prev
      );

      // 2. Sincronização em segundo plano
      try {
        const updated = await strengthApi.completeSet(sessionId, {
          ...input,
          operationId,
        });
        onUpdate(updated);
      } catch (err) {
        if (previous) onUpdate(previous);
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [sessionId, onUpdate, onError]
  );

  const editSet = useCallback(
    async (exerciseId: string, setId: string, input: EditSetInput) => {
      if (!sessionId) return;
      const previous = sessionRef.current;

      // 1. Atualização otimista imediata
      onUpdate((prev) =>
        prev ? patchSetLocally(prev, exerciseId, setId, input as Partial<StrengthSet>) : prev
      );

      // 2. Sincronização em segundo plano
      try {
        const updated = await strengthApi.editSet(sessionId, exerciseId, setId, input);
        onUpdate(updated);
      } catch (err) {
        if (previous) onUpdate(previous);
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [sessionId, onUpdate, onError]
  );

  const removeSet = useCallback(
    async (exerciseId: string, setId: string) => {
      if (!sessionId) return;
      const previous = sessionRef.current;

      // 1. Atualização otimista imediata
      onUpdate((prev) => (prev ? removeSetLocally(prev, exerciseId, setId) : prev));

      // 2. Sincronização em segundo plano
      try {
        const updated = await strengthApi.removeSet(sessionId, exerciseId, setId);
        onUpdate(updated);
      } catch (err) {
        if (previous) onUpdate(previous);
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [sessionId, onUpdate, onError]
  );

  const finish = useCallback(
    async (input?: FinishSessionInput) => {
      if (!sessionId) return;
      try {
        const completed = await strengthApi.finishSession(sessionId, input ?? {});
        return completed;
      } catch (err) {
        // Offline fallback: enfileirar finalização para quando a rede voltar
        const isNetworkError = err instanceof ApiError && err.status === 0;
        if (isNetworkError && userId) {
          const clientUuid = crypto.randomUUID();
          await enqueueOperation(
            'strength_finish_session',
            { sessionId, ...(input ?? {}) } as Record<string, unknown>,
            {
              userId,
              clientUuid,
              entityTable: 'strength_sessions',
              apiEndpoint: `/api/strength/sessions/${sessionId}/finish`,
              method: 'POST',
            }
          );
          // Retornar null sinaliza à página que deve navegar para home
          return null;
        }
        throw err;
      }
    },
    [sessionId, userId]
  );

  const cancel = useCallback(async () => {
    if (!sessionId) return;
    const previous = sessionRef.current;
    try {
      const updated = await strengthApi.cancelSession(sessionId);
      onUpdate(updated);
    } catch (err) {
      if (previous) onUpdate(previous);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [sessionId, onUpdate, onError]);

  return {
    pause,
    resume,
    addExercise,
    removeExercise,
    addSet,
    completeSet,
    editSet,
    removeSet,
    finish,
    cancel,
  };
}
