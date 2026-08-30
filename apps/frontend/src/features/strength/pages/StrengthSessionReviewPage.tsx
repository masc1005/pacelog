import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SessionSummary } from '../components/SessionSummary';
import { strengthApi } from '../../../services/strength.api';
import type { CompletedStrengthSession } from '@pacelog/shared';

export const StrengthSessionReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionId: string | undefined = (location.state as any)?.sessionId;

  const [session, setSession] = useState<CompletedStrengthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmptySession, setIsEmptySession] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      navigate('/strength', { replace: true });
      return;
    }

    async function finishAndLoad() {
      setIsLoading(true);
      setError(null);
      setIsEmptySession(false);
      try {
        const completed = await strengthApi.finishSession(sessionId!, {});
        setSession(completed as CompletedStrengthSession);
      } catch (err: any) {
        const isNoExercises =
          err?.code === 'STRENGTH_SESSION_NO_EXERCISES' ||
          err?.message?.includes('exercício') ||
          (err?.details as any)?.message?.includes('exercício');

        if (isNoExercises) {
          setIsEmptySession(true);
        } else {
          setError(err?.details?.message || err?.message || 'Não foi possível finalizar a sessão.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    finishAndLoad();
  }, [sessionId, navigate]);

  function handleEdit() {
    navigate('/strength/active');
  }

  function handleSave() {
    // Sessão já está salva no backend (status = completed e sincronizada no SessionModel).
    // Redireciona para o histórico unificado de treinos (/sessions).
    navigate('/sessions', { replace: true });
  }

  async function handleDiscard() {
    if (sessionId) {
      try {
        await strengthApi.cancelSession(sessionId);
      } catch (err) {
        console.error('Erro ao descartar sessão:', err);
      }
    }
    navigate('/sessions', { replace: true });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]" aria-busy="true">
        <p className="font-mono text-sm text-[#8F9380] animate-pulse uppercase tracking-widest">
          Calculando métricas…
        </p>
      </div>
    );
  }

  if (isEmptySession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-6 text-center max-w-md mx-auto" role="alert">
        <div className="w-12 h-12 rounded-full bg-[#FFB800]/10 flex items-center justify-center text-[#FFB800] border border-[#FFB800]/30">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-lg font-bold text-[#D4E4FA] uppercase tracking-wide">
            Nenhum Exercício Registrado
          </h2>
          <p className="font-mono text-xs text-[#8F9380] leading-relaxed">
            Não é possível finalizar uma sessão sem exercícios. Você pode voltar para adicionar exercícios ou descartar este treino.
          </p>
        </div>
        <div className="flex gap-3 w-full mt-2">
          <button
            className="flex-1 py-2.5 px-4 border border-[#1F2937] text-[#C5C8B4] hover:bg-[#161C24] font-mono text-xs uppercase font-bold tracking-widest rounded-[2px] transition-colors"
            onClick={handleEdit}
          >
            Voltar ao Treino
          </button>
          <button
            className="flex-1 py-2.5 px-4 bg-[#FF6B35] text-[#0A0D14] hover:bg-[#e05a2b] font-mono text-xs uppercase font-bold tracking-widest rounded-[2px] transition-colors shadow-[0_0_10px_rgba(255,107,53,0.2)]"
            onClick={handleDiscard}
          >
            Descartar Treino
          </button>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-6 text-center max-w-md mx-auto" role="alert">
        <p className="font-mono text-xs text-[#FF6B35] bg-[#FF6B35]/10 px-4 py-2.5 rounded-[4px] border border-[#FF6B35]/50 w-full">
          {error || 'Sessão não encontrada.'}
        </p>
        <div className="flex gap-3 w-full mt-2">
          <button
            className="flex-1 py-2.5 px-4 border border-[#1F2937] text-[#C5C8B4] hover:bg-[#161C24] font-mono text-xs uppercase font-bold tracking-widest rounded-[2px] transition-colors"
            onClick={handleEdit}
          >
            Voltar ao Treino
          </button>
          <button
            className="flex-1 py-2.5 px-4 bg-[#FF6B35] text-[#0A0D14] hover:bg-[#e05a2b] font-mono text-xs uppercase font-bold tracking-widest rounded-[2px] transition-colors shadow-[0_0_10px_rgba(255,107,53,0.2)]"
            onClick={handleDiscard}
          >
            Descartar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 font-sans pb-24">
      <SessionSummary
        session={session}
        onSave={handleSave}
        onEdit={handleEdit}
        isSaving={isSaving}
      />
    </div>
  );
};
