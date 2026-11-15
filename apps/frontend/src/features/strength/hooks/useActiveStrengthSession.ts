import { useState, useEffect, useCallback, useRef } from 'react';
import type { ActiveStrengthSession } from '@pacelog/shared';
import { strengthApi } from '../../../services/strength.api';

type SessionState = {
  session: ActiveStrengthSession | null;
  isLoading: boolean;
  error: string | null;
};

const RECOVERY_KEY = 'pacelog_strength_session_id';

// Estado compartilhado em nível de módulo para sincronizar múltiplos consumidores
// (ex.: ActiveStrengthSessionPage e ActiveStrengthFloatingBar no MainLayout)
let sharedState: SessionState = {
  session: null,
  isLoading: true,
  error: null,
};
let hasFetchedInitial = false;
let fetchPromise: Promise<void> | null = null;
const listeners = new Set<(state: SessionState) => void>();

function notifyListeners() {
  for (const listener of listeners) {
    listener(sharedState);
  }
}

function updateSharedState(next: SessionState) {
  sharedState = next;
  notifyListeners();
}

/**
 * Hook principal de gerenciamento da sessão ativa de musculação.
 * - Recupera sessão ao montar (verificando backend)
 * - Persiste id localmente para recuperação após reload
 * - Compartilha estado reativo entre todas as instâncias montadas
 */
export function useActiveStrengthSession() {
  const [state, setState] = useState<SessionState>(sharedState);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const listener = (nextState: SessionState) => {
      if (isMounted.current) {
        setState(nextState);
      }
    };
    listeners.add(listener);
    // Sincroniza caso tenha mudado antes do efeito rodar
    setState(sharedState);

    return () => {
      isMounted.current = false;
      listeners.delete(listener);
    };
  }, []);

  // Carrega sessão ativa do backend na primeira montagem
  useEffect(() => {
    if (hasFetchedInitial || fetchPromise) return;

    fetchPromise = (async () => {
      try {
        const session = await strengthApi.getActiveSession();
        hasFetchedInitial = true;
        if (session) {
          localStorage.setItem(RECOVERY_KEY, session.id);
        } else {
          localStorage.removeItem(RECOVERY_KEY);
        }
        updateSharedState({ session, isLoading: false, error: null });
      } catch {
        hasFetchedInitial = true;
        updateSharedState({
          ...sharedState,
          isLoading: false,
          error: 'Não foi possível verificar a sessão ativa.',
        });
      } finally {
        fetchPromise = null;
      }
    })();
  }, []);

  const setSession = useCallback(
    (
      updater:
        | ActiveStrengthSession
        | null
        | ((prev: ActiveStrengthSession | null) => ActiveStrengthSession | null)
    ) => {
      const newSession =
        typeof updater === 'function' ? updater(sharedState.session) : updater;
      if (newSession) {
        localStorage.setItem(RECOVERY_KEY, newSession.id);
      } else {
        localStorage.removeItem(RECOVERY_KEY);
      }
      updateSharedState({ session: newSession, isLoading: false, error: null });
    },
    []
  );

  const clearError = useCallback(() => {
    updateSharedState({ ...sharedState, error: null });
  }, []);

  return {
    session: state.session,
    isLoading: state.isLoading,
    error: state.error,
    setSession,
    clearError,
  };
}
