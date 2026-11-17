import { useState, useEffect, useCallback, useRef } from 'react';
import type { ActiveStrengthSession } from '@pacelog/shared';
import { strengthApi } from '../../../services/strength.api';
import { useAuth } from '../../../contexts/AuthContext';

type SessionState = {
  session: ActiveStrengthSession | null;
  isLoading: boolean;
  error: string | null;
};

const RECOVERY_KEY = 'pacelog_strength_session_id';

// Estado compartilhado em nível de módulo para sincronizar múltiplos consumidores
// (ex.: ActiveStrengthSessionPage, StrengthHomePage e ActiveStrengthFloatingBar no MainLayout)
let sharedState: SessionState = {
  session: null,
  isLoading: true,
  error: null,
};
let activeUserId: string | null = null;
let hasFetchedInitial = false;
let fetchPromise: Promise<ActiveStrengthSession | null> | null = null;
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

function persistRecoveryId(session: ActiveStrengthSession | null) {
  try {
    if (session) {
      localStorage.setItem(RECOVERY_KEY, session.id);
    } else {
      localStorage.removeItem(RECOVERY_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

async function fetchActiveSessionFromServer(): Promise<ActiveStrengthSession | null> {
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const session = await strengthApi.getActiveSession();
      hasFetchedInitial = true;
      persistRecoveryId(session);
      updateSharedState({ session, isLoading: false, error: null });
      return session;
    } catch {
      hasFetchedInitial = true;
      updateSharedState({
        ...sharedState,
        isLoading: false,
        error: 'Não foi possível verificar a sessão ativa.',
      });
      return null;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Hook principal de gerenciamento da sessão ativa de musculação.
 * - Recupera sessão ao montar (verificando backend)
 * - Reseta cache em memória caso o usuário autenticado mude (logout/login)
 * - Persiste id localmente para recuperação após reload
 * - Compartilha estado reativo entre todas as instâncias montadas
 */
export function useActiveStrengthSession() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
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

  // Reseta estado compartilhado ao trocar/deslogar usuário e carrega sessão ativa na primeira montagem
  useEffect(() => {
    if (activeUserId !== userId) {
      activeUserId = userId;
      hasFetchedInitial = false;
      fetchPromise = null;
      if (!userId) {
        persistRecoveryId(null);
        updateSharedState({ session: null, isLoading: false, error: null });
        return;
      }
      updateSharedState({ session: null, isLoading: true, error: null });
    }

    if (!userId || hasFetchedInitial || fetchPromise) return;
    fetchActiveSessionFromServer();
  }, [userId]);

  const setSession = useCallback(
    (
      updater:
        | ActiveStrengthSession
        | null
        | ((prev: ActiveStrengthSession | null) => ActiveStrengthSession | null)
    ) => {
      const newSession =
        typeof updater === 'function' ? updater(sharedState.session) : updater;
      hasFetchedInitial = true;
      persistRecoveryId(newSession);
      updateSharedState({ session: newSession, isLoading: false, error: null });
    },
    []
  );

  const refreshSession = useCallback(async (): Promise<ActiveStrengthSession | null> => {
    if (!userId) {
      persistRecoveryId(null);
      updateSharedState({ session: null, isLoading: false, error: null });
      return null;
    }
    return fetchActiveSessionFromServer();
  }, [userId]);

  const clearError = useCallback(() => {
    updateSharedState({ ...sharedState, error: null });
  }, []);

  return {
    session: state.session,
    isLoading: state.isLoading,
    error: state.error,
    setSession,
    refreshSession,
    clearError,
  };
}
