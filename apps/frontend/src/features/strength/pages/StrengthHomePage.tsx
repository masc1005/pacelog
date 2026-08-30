import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveStrengthSession } from '../hooks/useActiveStrengthSession';
import { strengthApi } from '../../../services/strength.api';
import { randomUUID } from '../../../lib/utils';

/**
 * Ponto de entrada do módulo de musculação.
 *
 * Comportamento:
 * - Sessão ativa encontrada → redireciona direto para /strength/active
 * - Sem sessão ativa → inicia nova sessão automaticamente → /strength/active
 *
 * O histórico unificado de todos os esportes fica em /sessions.
 */
export const StrengthHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { session, isLoading } = useActiveStrengthSession();
  const startedRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (session) {
      // Já há sessão ativa — retoma
      navigate('/strength/active', { replace: true });
      return;
    }

    // Evita dupla chamada em StrictMode
    if (startedRef.current) return;
    startedRef.current = true;

    // Inicia nova sessão automaticamente
    strengthApi
      .startSession({ operationId: randomUUID() })
      .then(() => navigate('/strength/active', { replace: true }))
      .catch((err) => {
        console.error('Erro ao iniciar sessão de musculação:', err);
        // Se falhar (ex: já existe sessão — race condition), tenta ir para ativa mesmo assim
        navigate('/strength/active', { replace: true });
      });
  }, [isLoading, session, navigate]);

  // Tela de carregamento mínima enquanto verifica / inicia
  return (
    <div className="flex items-center justify-center min-h-[50vh]" aria-busy="true">
      <p className="font-mono text-sm text-[#8F9380] animate-pulse uppercase tracking-widest">
        Iniciando Treino…
      </p>
    </div>
  );
};
