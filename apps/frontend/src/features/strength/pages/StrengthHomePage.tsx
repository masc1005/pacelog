import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useActiveStrengthSession } from '../hooks/useActiveStrengthSession';
import { strengthApi } from '../../../services/strength.api';
import { randomUUID, toLocalInputDateTime } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Dumbbell, ArrowLeft, Play } from 'lucide-react';

/**
 * Ponto de entrada do módulo de musculação.
 *
 * Comportamento:
 * - Sessão ativa encontrada → redireciona direto para /strength/active
 * - Parâmetro autoStart recebido via navegação → inicia imediatamente com data/hora escolhida
 * - Sem sessão ativa → permite definir data/hora de início (ou iniciar no instante atual)
 */
export const StrengthHomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, isLoading } = useActiveStrengthSession();
  const [customStartedAt, setCustomStartedAt] = useState<string>(() =>
    toLocalInputDateTime(new Date())
  );
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const state = location.state as { startedAt?: string; autoStart?: boolean } | null;
  const passedStartedAt = state?.startedAt;
  const autoStart = state?.autoStart;

  useEffect(() => {
    if (isLoading) return;

    if (session) {
      // Já há sessão ativa — retoma
      navigate('/strength/active', { replace: true });
      return;
    }

    if (autoStart && passedStartedAt && !startedRef.current) {
      startedRef.current = true;
      setIsStarting(true);
      strengthApi
        .startSession({
          operationId: randomUUID(),
          startedAt: passedStartedAt,
        })
        .then(() => navigate('/strength/active', { replace: true }))
        .catch((err) => {
          console.error('Erro ao auto-iniciar sessão de musculação:', err);
          navigate('/strength/active', { replace: true });
        });
    }
  }, [isLoading, session, autoStart, passedStartedAt, navigate]);

  const handleStart = async () => {
    if (isStarting) return;
    setIsStarting(true);
    setError(null);
    try {
      const isoDate = new Date(customStartedAt).toISOString();
      await strengthApi.startSession({
        operationId: randomUUID(),
        startedAt: isoDate,
      });
      navigate('/strength/active', { replace: true });
    } catch (err: any) {
      console.error('Erro ao iniciar treino:', err);
      setError(err?.message || 'Erro ao iniciar treino.');
      setIsStarting(false);
    }
  };

  // Tela de carregamento enquanto verifica se há sessão ativa ou executa auto-start
  if (isLoading || (autoStart && passedStartedAt)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]" aria-busy="true">
        <p className="font-mono text-sm text-[#8F9380] animate-pulse uppercase tracking-widest">
          {autoStart ? 'Iniciando Treino…' : 'Carregando…'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-lg mx-auto w-full p-4 sm:p-0 gap-6 pb-24 font-sans">
      <header className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <button
          className="flex items-center gap-2 font-mono text-xs text-[#8F9380] hover:text-[#D4E4FA] transition-colors"
          onClick={() => navigate('/sessions')}
          aria-label="Voltar para Sessões"
        >
          <ArrowLeft className="h-4 w-4" />
          Sessões
        </button>
      </header>

      <Card className="p-6 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[4px] bg-[#A855F7]/10 border border-[#A855F7]/30 flex items-center justify-center text-[#A855F7]">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-display text-xl font-bold text-[#D4E4FA] uppercase tracking-wide">
              Novo Treino
            </h1>
            <p className="font-mono text-xs text-[#8F9380]">
              Musculação & Hipertrofia
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-[#FF6B35]/10 border border-[#FF6B35]/50 rounded-[4px] font-mono text-xs text-[#FF6B35]">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2 border-t border-[#1F2937]">
          <div className="flex items-center justify-between">
            <label
              htmlFor="strength-start-time"
              className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest"
            >
              Data e Hora de Início
            </label>
            <button
              type="button"
              onClick={() => setCustomStartedAt(toLocalInputDateTime(new Date()))}
              className="font-mono text-[10px] uppercase text-[#D4F684] hover:underline"
            >
              Usar Agora
            </button>
          </div>
          <input
            id="strength-start-time"
            type="datetime-local"
            value={customStartedAt}
            onChange={(e) => setCustomStartedAt(e.target.value)}
            className="w-full bg-[#161C24] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-sm rounded-[4px] px-3.5 py-2.5 outline-none transition-colors"
          />
          <p className="font-mono text-[11px] text-[#8F9380]">
            Defina o início para sincronização precisa da linha do tempo e telemetria.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="tactile"
            size="lg"
            isLoading={isStarting}
            onClick={handleStart}
            leftIcon={<Play className="h-4 w-4" />}
            className="w-full justify-center"
          >
            Iniciar Treino
          </Button>
          <button
            type="button"
            onClick={() => navigate('/sessions')}
            className="w-full py-2 text-center font-mono text-xs text-[#8F9380] hover:text-[#C5C8B4] transition-colors"
          >
            Cancelar
          </button>
        </div>
      </Card>
    </div>
  );
};
