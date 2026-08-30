import React from 'react';
import { formatDuration } from '../hooks/useSessionTimer';
import type { ActiveStrengthSession } from '@pacelog/shared';
import { X } from 'lucide-react';

interface ActiveSessionHeaderProps {
  session: ActiveStrengthSession;
  elapsedSeconds: number;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const ActiveSessionHeader: React.FC<ActiveSessionHeaderProps> = ({
  session,
  elapsedSeconds,
  onPause,
  onResume,
  onFinish,
  onCancel,
  isLoading = false,
}) => {
  const isPaused = session.status === 'paused';

  return (
    <div className="flex items-center justify-between p-4 bg-[#051424] border-b border-[#1F2937]">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-lg font-bold text-[#D4E4FA] uppercase tracking-wide">
          Sessão de Musculação
        </h1>
        <SessionTimer seconds={elapsedSeconds} isPaused={isPaused} />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {onCancel && (
          <button
            id="btn-cancel-session"
            type="button"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] hover:bg-[#FF6B35]/20 border border-[#FF6B35]/30 transition-colors"
            onClick={onCancel}
            disabled={isLoading}
            title="Desistir / Descartar sessão"
            aria-label="Desistir da sessão"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {isPaused ? (
          <button
            id="btn-resume-session"
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#D4F684]/10 text-[#D4F684] hover:bg-[#D4F684]/20 transition-colors"
            onClick={onResume}
            disabled={isLoading}
            aria-label="Retomar sessão"
          >
            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z" /></svg>
          </button>
        ) : (
          <button
            id="btn-pause-session"
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#FFB800]/10 text-[#FFB800] hover:bg-[#FFB800]/20 transition-colors"
            onClick={onPause}
            disabled={isLoading}
            aria-label="Pausar sessão"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4h3v12H5zm7 0h3v12h-3z" /></svg>
          </button>
        )}

        <button
          id="btn-finish-session"
          className="py-2 px-3 sm:px-4 bg-[#D4F684] text-[#0A0D14] hover:bg-[#bce65c] font-mono text-xs uppercase font-bold tracking-widest rounded-[2px] transition-colors shadow-[0_0_10px_rgba(212,246,132,0.2)]"
          onClick={onFinish}
          disabled={isLoading}
        >
          Finalizar
        </button>
      </div>
    </div>
  );
};

interface SessionTimerProps {
  seconds: number;
  isPaused: boolean;
}

export const SessionTimer: React.FC<SessionTimerProps> = ({
  seconds,
  isPaused,
}) => {
  return (
    <div
      className={`flex items-center gap-2 font-mono text-sm tracking-wider ${isPaused ? 'text-[#8F9380]' : 'text-[#D4F684]'}`}
      aria-label={`Duração da sessão: ${formatDuration(seconds)}${isPaused ? ' — pausado' : ''}`}
      aria-live="polite"
    >
      <span className="font-bold">{formatDuration(seconds)}</span>
      {isPaused && (
        <span className="text-[10px] uppercase bg-[#FFB800]/20 text-[#FFB800] px-2 py-0.5 rounded-[2px] font-bold" aria-hidden="true">
          Pausado
        </span>
      )}
    </div>
  );
};
