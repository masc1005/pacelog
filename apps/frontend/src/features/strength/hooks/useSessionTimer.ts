import { useState, useEffect, useRef, useCallback } from 'react';
import { calcSessionDuration } from '@pacelog/shared';
import type { ActiveStrengthSession } from '@pacelog/shared';

/**
 * Hook que calcula e atualiza a duração líquida da sessão em tempo real.
 * Considera pausas via timestamps, não decrementa memória.
 */
export function useSessionTimer(session: ActiveStrengthSession | null): number {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    if (!session) {
      setElapsedSeconds(0);
      return;
    }

    const duration = calcSessionDuration(
      session.startedAt,
      session.totalPausedSeconds,
      new Date(),
      session.status === 'paused' ? session.pausedAt : undefined
    );

    setElapsedSeconds(duration);
  }, [session]);

  useEffect(() => {
    tick();

    if (session && session.status === 'active') {
      intervalRef.current = setInterval(tick, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session?.status, tick]);

  return elapsedSeconds;
}

/**
 * Formata segundos em MM:SS ou HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
