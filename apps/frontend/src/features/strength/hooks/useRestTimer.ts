import { useState, useEffect, useRef, useCallback } from 'react';
import type { RestTimer } from '@pacelog/shared';

const DEFAULT_REST_SECONDS = 90;

/**
 * Hook de timer de descanso calculado a partir de timestamps.
 * Inicia automaticamente quando uma série é concluída.
 */
export function useRestTimer() {
  const [timer, setTimer] = useState<RestTimer>({
    isRunning: false,
    durationSeconds: DEFAULT_REST_SECONDS,
    remainingSeconds: DEFAULT_REST_SECONDS,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    setTimer((prev) => {
      if (!prev.isRunning || !prev.startedAt) return prev;

      const elapsed = Math.round(
        (Date.now() - new Date(prev.startedAt).getTime()) / 1000
      );
      const remaining = Math.max(0, prev.durationSeconds - elapsed);

      if (remaining === 0) {
        // Timer terminou — vibrar se suportado
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
        return { ...prev, isRunning: false, remainingSeconds: 0 };
      }

      return { ...prev, remainingSeconds: remaining };
    });
  }, []);

  useEffect(() => {
    if (timer.isRunning) {
      intervalRef.current = setInterval(tick, 500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timer.isRunning, tick]);

  const start = useCallback(
    (
      durationSeconds = DEFAULT_REST_SECONDS,
      context?: { exerciseId?: string; setId?: string }
    ) => {
      setTimer({
        isRunning: true,
        startedAt: new Date().toISOString(),
        durationSeconds,
        remainingSeconds: durationSeconds,
        ...context,
      });
    },
    []
  );

  const pause = useCallback(() => {
    setTimer((prev) => ({ ...prev, isRunning: false }));
  }, []);

  const resume = useCallback(() => {
    setTimer((prev) => {
      if (prev.remainingSeconds <= 0) return prev;
      // Recalcular startedAt para preservar o tempo restante
      const newStartedAt = new Date(
        Date.now() - (prev.durationSeconds - prev.remainingSeconds) * 1000
      ).toISOString();
      return { ...prev, isRunning: true, startedAt: newStartedAt };
    });
  }, []);

  const reset = useCallback((durationSeconds?: number) => {
    setTimer((prev) => {
      const dur = durationSeconds ?? prev.durationSeconds;
      return {
        isRunning: true,
        startedAt: new Date().toISOString(),
        durationSeconds: dur,
        remainingSeconds: dur,
      };
    });
  }, []);

  const dismiss = useCallback(() => {
    setTimer((prev) => ({
      isRunning: false,
      durationSeconds: prev.durationSeconds,
      remainingSeconds: prev.durationSeconds,
    }));
  }, []);

  const setDuration = useCallback((seconds: number) => {
    setTimer((prev) => ({
      ...prev,
      durationSeconds: seconds,
      remainingSeconds: prev.isRunning ? prev.remainingSeconds : seconds,
    }));
  }, []);

  return { timer, start, pause, resume, reset, dismiss, setDuration };
}
