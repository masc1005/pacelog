import React from 'react';
import { formatDuration } from '../hooks/useSessionTimer';
import type { RestTimer as RestTimerState } from '@pacelog/shared';

interface RestTimerProps {
  timer: RestTimerState;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onDismiss: () => void;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  timer,
  onPause,
  onResume,
  onReset,
  onDismiss,
}) => {
  if (!timer.isRunning && timer.remainingSeconds === timer.durationSeconds) {
    return null; // Timer não iniciado ainda
  }

  const progress =
    timer.durationSeconds > 0
      ? (timer.remainingSeconds / timer.durationSeconds) * 100
      : 0;

  const isFinished = timer.remainingSeconds === 0;
  const isRunning = timer.isRunning;

  return (
    <div
      className={`fixed bottom-[72px] left-0 right-0 z-40 mx-auto max-w-2xl px-4 transition-all transform ${isFinished ? 'animate-bounce' : ''}`}
      role="timer"
      aria-label={
        isFinished
          ? 'Descanso finalizado'
          : `Descanso: ${formatDuration(timer.remainingSeconds)} restantes`
      }
      aria-live={isFinished ? 'assertive' : 'polite'}
    >
      <div className={`flex flex-col bg-[#051424] border rounded-[4px] shadow-[0_-5px_20px_rgba(0,0,0,0.5)] overflow-hidden transition-colors ${isFinished ? 'border-[#D4F684]' : 'border-[#1F2937]'}`}>
        <div className="flex items-center justify-between p-3 border-b border-[#1F2937]/50 bg-[#161C24]">
          <span className={`font-mono text-[10px] uppercase font-bold tracking-widest ${isFinished ? 'text-[#D4F684]' : 'text-[#8F9380]'}`}>
            {isFinished ? '✓ Pronto para próxima série!' : 'Descanso'}
          </span>
          <button
            id="btn-dismiss-rest"
            className="flex items-center justify-center w-6 h-6 rounded-[2px] text-[#8F9380] hover:text-[#D4E4FA] hover:bg-[#051424] transition-colors"
            onClick={onDismiss}
            aria-label="Dispensar timer de descanso"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex items-center justify-between p-4">
          <div className="flex items-center justify-center w-24">
            <span
              className={`font-display text-3xl font-bold tracking-wider transition-colors ${isFinished ? 'text-[#D4F684]' : 'text-[#D4E4FA]'}`}
            >
              {formatDuration(timer.remainingSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isRunning ? (
              <button
                id="btn-pause-rest"
                className="flex items-center justify-center w-10 h-10 rounded-[2px] bg-[#FFB800]/10 text-[#FFB800] hover:bg-[#FFB800]/20 transition-colors"
                onClick={onPause}
                aria-label="Pausar descanso"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4h3v12H5zm7 0h3v12h-3z" /></svg>
              </button>
            ) : (
              <button
                id="btn-resume-rest"
                className="flex items-center justify-center w-10 h-10 rounded-[2px] bg-[#D4F684]/10 text-[#D4F684] hover:bg-[#D4F684]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onResume}
                aria-label="Retomar descanso"
                disabled={isFinished}
              >
                <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z" /></svg>
              </button>
            )}

            <button
              id="btn-reset-rest"
              className="flex items-center justify-center w-10 h-10 rounded-[2px] bg-[#161C24] text-[#C5C8B4] hover:bg-[#1F2937] hover:text-[#D4E4FA] transition-colors"
              onClick={onReset}
              aria-label={`Reiniciar descanso (${formatDuration(timer.durationSeconds)})`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="w-full h-1 bg-[#161C24]" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={`h-full transition-all duration-1000 linear ${isFinished ? 'bg-[#D4F684]' : 'bg-[#38BDF8]'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
