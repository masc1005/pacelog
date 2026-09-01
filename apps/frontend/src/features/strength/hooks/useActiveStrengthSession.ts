import { useState, useEffect, useCallback, useRef } from 'react';
import type { ActiveStrengthSession } from '@pacelog/shared';
import { strengthApi } from '../../../services/strength.api';

type SessionState = {
  session: ActiveStrengthSession | null;
  isLoading: boolean;
  error: string | null;
};

const RECOVERY_KEY = 'pacelog_strength_session_id';

/**
 * Hook principal de gerenciamento da sessão ativa de musculação.
 * - Recupera sessão ao montar (verificando backend)
 * - Persiste id localmente para recuperação após reload
 * - Mantém estado local sincronizado com as respostas do backend
 */
export function useActiveStrengthSession() {
  const [state, setState] = useState<SessionState>({
    session: null,
    isLoading: true,
    error: null,
  });

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Carrega sessão ativa do backend na montagem do hook
  useEffect(() => {
    let cancelled = false;

    async function loadActiveSession() {
      try {
        const session = await strengthApi.getActiveSession();
        if (!cancelled && isMounted.current) {
          setState({ session, isLoading: false, error: null });
          if (session) {
            localStorage.setItem(RECOVERY_KEY, session.id);
          } else {
            localStorage.removeItem(RECOVERY_KEY);
          }
        }
      } catch (err) {
        if (!cancelled && isMounted.current) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Não foi possível verificar a sessão ativa.',
          }));
        }
      }
    }

    loadActiveSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const setSession = useCallback(
    (
      updater:
        | ActiveStrengthSession
        | null
        | ((prev: ActiveStrengthSession | null) => ActiveStrengthSession | null)
    ) => {
      if (!isMounted.current) return;
      setState((prevState) => {
        const newSession =
          typeof updater === 'function' ? updater(prevState.session) : updater;
        if (newSession) {
          localStorage.setItem(RECOVERY_KEY, newSession.id);
        } else {
          localStorage.removeItem(RECOVERY_KEY);
        }
        return { session: newSession, isLoading: false, error: null };
      });
    },
    []
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    session: state.session,
    isLoading: state.isLoading,
    error: state.error,
    setSession,
    clearError,
  };
}
