import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveStrengthSession } from '../hooks/useActiveStrengthSession';
import { strengthApi } from '../../../services/strength.api';
import { randomUUID } from '../../../lib/utils';


export const StrengthHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { session, isLoading } = useActiveStrengthSession();
  const [isStarting, setIsStarting] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  async function handleStartSession() {
    setIsStarting(true);
    try {
      await strengthApi.startSession({ operationId: randomUUID() });
      navigate('/strength/active');
    } catch (err) {
      console.error('Erro ao iniciar sessão:', err);
    } finally {
      setIsStarting(false);
    }
  }

  async function handleDiscard() {
    if (!session) return;
    if (!window.confirm('Descartar a sessão em andamento? Esta ação não pode ser desfeita.')) return;
    setIsDiscarding(true);
    try {
      await strengthApi.cancelSession(session.id);
      window.location.reload();
    } catch (err) {
      console.error('Erro ao descartar sessão:', err);
    } finally {
      setIsDiscarding(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]" aria-busy="true">
        <p className="font-mono text-sm text-[#8F9380] animate-pulse uppercase tracking-widest">
          Carregando Sessão...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans max-w-2xl mx-auto w-full p-4 sm:p-0">
      <div className="flex flex-col mb-4">
        <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
          Musculação
        </h1>
        <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase">
          Precision Telemetry
        </p>
      </div>

      {session ? (
        // Sessão em andamento
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="p-6 bg-[#161C24] border border-[#D4F684] shadow-[0_0_15px_rgba(212,246,132,0.1)] rounded-[4px] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] text-[#D4F684] uppercase tracking-widest font-bold">
                Sessão em andamento
              </p>
              <div className="h-2 w-2 bg-[#D4F684] rounded-full animate-pulse" />
            </div>
            <p className="text-sm text-[#C5C8B4]">
              {session.exercises.length > 0
                ? `${session.exercises.length} exercício${session.exercises.length > 1 ? 's' : ''} registrado${session.exercises.length > 1 ? 's' : ''}`
                : 'Nenhum exercício registrado ainda.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <button
              id="btn-resume-session"
              className="flex items-center justify-center gap-2 py-3 px-4 bg-[#D4F684] text-[#0A0D14] hover:bg-[#bce65c] font-mono text-xs uppercase font-bold tracking-widest rounded-[2px] transition-colors"
              onClick={() => navigate('/strength/active')}
            >
              Retomar Sessão
            </button>
            <button
              id="btn-discard-session"
              className="flex items-center justify-center gap-2 py-3 px-4 bg-transparent border border-[#FF6B35] text-[#FF6B35] hover:bg-[#FF6B35] hover:text-[#0A0D14] font-mono text-xs uppercase font-bold tracking-widest rounded-[2px] transition-colors"
              onClick={handleDiscard}
              disabled={isDiscarding}
            >
              {isDiscarding ? 'Descartando…' : 'Descartar Sessão'}
            </button>
          </div>
        </div>
      ) : (
        // Sem sessão ativa
        <div className="flex flex-col gap-6 animate-in fade-in">
          <div className="p-8 bg-[#0D1C2D] border border-[#1F2937] rounded-[4px] flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[#161C24] flex items-center justify-center border border-[#1F2937] mb-2">
              <svg className="w-8 h-8 text-[#A855F7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <p className="text-[#C5C8B4] text-sm max-w-sm">
              Inicie um novo treino vazio ou explore o seu histórico de sessões anteriores.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              id="btn-start-session"
              className="flex items-center justify-center gap-2 py-4 px-4 bg-[#A855F7] text-white hover:bg-[#9333EA] font-mono text-sm uppercase font-bold tracking-widest rounded-[2px] transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
              onClick={handleStartSession}
              disabled={isStarting}
            >
              {isStarting ? 'Iniciando…' : 'Iniciar Treino Vazio'}
            </button>
            <button
              id="btn-view-history"
              className="flex items-center justify-center gap-2 py-4 px-4 bg-[#161C24] border border-[#1F2937] text-[#C5C8B4] hover:bg-[#1F2937] hover:text-white font-mono text-sm uppercase font-bold tracking-widest rounded-[2px] transition-colors"
              onClick={() => navigate('/strength/history')}
            >
              Ver Histórico
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
