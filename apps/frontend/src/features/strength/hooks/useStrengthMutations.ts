import { useCallback, useRef } from 'react';
import { randomUUID } from '../../../lib/utils';
import { strengthApi } from '../../../services/strength.api';
import type {
  ActiveStrengthSession,
  AddExerciseInput,
  AddSetInput,
  CompleteSetInput,
  EditSetInput,
  FinishSessionInput,
} from '@pacelog/shared';

/**
 * Hook de mutações da sessão ativa de musculação.
 * Cada mutação gera um operationId único para garantir idempotência.
 */
export function useStrengthMutations(
  sessionId: string | null,
  onUpdate: (session: ActiveStrengthSession) => void,
  onError?: (err: Error) => void
) {
  const pendingRef = useRef(new Set<string>());

  const withMutation = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
      const key = Math.random().toString(36);
      if (pendingRef.current.has(key)) return undefined;
      pendingRef.current.add(key);
      try {
        const result = await fn();
        return result;
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
        return undefined;
      } finally {
        pendingRef.current.delete(key);
      }
    },
    [onError]
  );

  const pause = useCallback(async () => {
    if (!sessionId) return;
    return withMutation(async () => {
      const updated = await strengthApi.pauseSession(sessionId);
      onUpdate(updated);
    });
  }, [sessionId, onUpdate, withMutation]);

  const resume = useCallback(async () => {
    if (!sessionId) return;
    return withMutation(async () => {
      const updated = await strengthApi.resumeSession(sessionId);
      onUpdate(updated);
    });
  }, [sessionId, onUpdate, withMutation]);

  const addExercise = useCallback(
    async (input: Omit<AddExerciseInput, 'operationId'>) => {
      if (!sessionId) return;
      return withMutation(async () => {
        const updated = await strengthApi.addExercise(sessionId, {
          ...input,
          operationId: randomUUID(),
        });
        onUpdate(updated);
      });
    },
    [sessionId, onUpdate, withMutation]
  );

  const removeExercise = useCallback(
    async (exerciseId: string) => {
      if (!sessionId) return;
      return withMutation(async () => {
        const updated = await strengthApi.removeExercise(sessionId, exerciseId);
        onUpdate(updated);
      });
    },
    [sessionId, onUpdate, withMutation]
  );

  const addSet = useCallback(
    async (input: Omit<AddSetInput, 'operationId'>) => {
      if (!sessionId) return;
      return withMutation(async () => {
        const updated = await strengthApi.addSet(sessionId, {
          ...input,
          operationId: randomUUID(),
        });
        onUpdate(updated);
      });
    },
    [sessionId, onUpdate, withMutation]
  );

  const completeSet = useCallback(
    async (input: Omit<CompleteSetInput, 'operationId'>) => {
      if (!sessionId) return;
      return withMutation(async () => {
        const updated = await strengthApi.completeSet(sessionId, {
          ...input,
          operationId: randomUUID(),
        });
        onUpdate(updated);
      });
    },
    [sessionId, onUpdate, withMutation]
  );

  const editSet = useCallback(
    async (
      exerciseId: string,
      setId: string,
      input: EditSetInput
    ) => {
      if (!sessionId) return;
      return withMutation(async () => {
        const updated = await strengthApi.editSet(
          sessionId,
          exerciseId,
          setId,
          input
        );
        onUpdate(updated);
      });
    },
    [sessionId, onUpdate, withMutation]
  );

  const removeSet = useCallback(
    async (exerciseId: string, setId: string) => {
      if (!sessionId) return;
      return withMutation(async () => {
        const updated = await strengthApi.removeSet(
          sessionId,
          exerciseId,
          setId
        );
        onUpdate(updated);
      });
    },
    [sessionId, onUpdate, withMutation]
  );

  const finish = useCallback(
    async (input?: FinishSessionInput) => {
      if (!sessionId) return;
      return withMutation(async () => {
        const completed = await strengthApi.finishSession(sessionId, input ?? {});
        return completed;
      });
    },
    [sessionId, withMutation]
  );

  const cancel = useCallback(async () => {
    if (!sessionId) return;
    return withMutation(async () => {
      const updated = await strengthApi.cancelSession(sessionId);
      onUpdate(updated);
    });
  }, [sessionId, onUpdate, withMutation]);

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
