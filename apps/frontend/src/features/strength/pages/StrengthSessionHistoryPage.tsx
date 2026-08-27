import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { strengthApi } from '../../../services/strength.api';
import { formatDuration } from '../hooks/useSessionTimer';
import type { CompletedStrengthSession } from '@pacelog/shared';

export const StrengthSessionHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<CompletedStrengthSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    strengthApi
      .listSessions(1, 50)
      .then((data) => setSessions(data))
      .catch(() => setSessions([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex flex-col max-w-2xl mx-auto w-full p-4 sm:p-0 gap-6 pb-24">
      <header className="flex items-center gap-4 mb-2">
        <button
          className="flex items-center justify-center w-10 h-10 rounded-[2px] border border-[#1F2937] text-[#8F9380] hover:text-[#D4E4FA] hover:bg-[#161C24] transition-colors"
          onClick={() => navigate('/strength')}
          aria-label="Voltar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
          Histórico de Treinos
        </h1>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[50vh]" aria-busy="true">
          <p className="font-mono text-sm text-[#8F9380] animate-pulse uppercase tracking-widest">
            Carregando Histórico…
          </p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="w-16 h-16 rounded-full bg-[#161C24] flex items-center justify-center border border-[#1F2937] mb-2">
            <svg className="w-8 h-8 text-[#8F9380]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          </div>
          <p className="text-[#C5C8B4] text-sm">Nenhuma sessão encontrada.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sessions.map((session) => (
            <button
              key={session.id}
              className="flex flex-col text-left p-4 bg-[#0D1C2D] border border-[#1F2937] hover:border-[#38BDF8] rounded-[4px] transition-colors group"
              onClick={() => navigate(`/strength/sessions/${session.id}`)}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <span className="font-display font-bold text-[#D4E4FA] group-hover:text-[#38BDF8] transition-colors">
                  {new Date(session.startedAt).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'short',
                  })}
                </span>
                <span className="font-mono text-xs text-[#8F9380] uppercase tracking-widest">
                  {formatDuration(session.durationSeconds)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 w-full border-t border-[#1F2937] pt-3">
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] uppercase text-[#8F9380]">Volume</span>
                  <span className="font-mono text-sm text-[#D4E4FA]">{session.totalVolumeKg != null ? `${session.totalVolumeKg.toLocaleString('pt-BR')} kg` : '—'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] uppercase text-[#8F9380]">Séries</span>
                  <span className="font-mono text-sm text-[#D4E4FA]">{session.completedSets}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] uppercase text-[#8F9380]">Exercícios</span>
                  <span className="font-mono text-sm text-[#D4E4FA]">{session.exercises.length}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
