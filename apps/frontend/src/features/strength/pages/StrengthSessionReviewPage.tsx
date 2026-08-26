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
    // Sessão já está salva no backend (status = completed).
    // Redireciona para home limpando o estado de sessão ativa.
    navigate('/strength', { replace: true });
  }

  if (isLoading) {
    return (
      <div className="session-review session-review--loading" aria-busy="true">
        Calculando métricas…
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="session-review session-review--error" role="alert">
        <p>{error || 'Sessão não encontrada.'}</p>
        <button
          className="btn btn--secondary"
          onClick={() => navigate('/strength')}
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="session-review">
      <SessionSummary
        session={session}
        onSave={handleSave}
        onEdit={handleEdit}
        isSaving={isSaving}
      />
    </div>
  );
};
