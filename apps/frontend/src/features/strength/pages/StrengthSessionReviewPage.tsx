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

  useEffect(() => {
    if (!sessionId) {
      navigate('/strength', { replace: true });
      return;
    }

    async function finishAndLoad() {
      try {
        const completed = await strengthApi.finishSession(sessionId!, {});
        setSession(completed as CompletedStrengthSession);
      } catch (err) {
        setError('Não foi possível finalizar a sessão. Verifique sua conexão.');
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]" aria-busy="true">
        <p className="font-mono text-sm text-[#8F9380] animate-pulse uppercase tracking-widest">
          Calculando métricas…
        </p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4" role="alert">
        <p className="font-mono text-sm text-[#FF6B35] bg-[#FF6B35]/10 px-4 py-2 rounded-[4px] border border-[#FF6B35]/50">
          {error || 'Sessão não encontrada.'}
        </p>
        <button
          className="px-4 py-2 border border-[#1F2937] text-[#C5C8B4] hover:bg-[#161C24] font-mono text-xs uppercase tracking-widest rounded-[2px]"
          onClick={() => navigate('/sessions')}
        >
          Voltar
        </button>
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
