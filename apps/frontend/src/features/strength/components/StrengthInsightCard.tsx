import React, { useEffect, useState } from 'react';
import { strengthApi } from '../../../services/strength.api';
import type { AIInsightDTO } from '@pacelog/shared';

interface StrengthInsightCardProps {
  sessionId: string;
}

type State =
  | { phase: 'loading' }
  | { phase: 'generating' }
  | { phase: 'done'; insight: AIInsightDTO }
  | { phase: 'error'; message: string };

/**
 * Exibe o insight de IA de uma sessão de força finalizada.
 * - Tenta buscar insight existente (GET)
 * - Se não existe (404), dispara geração automática (POST)
 * - Mostra estado de carregamento / geração / conteúdo / erro
 */
export const StrengthInsightCard: React.FC<StrengthInsightCardProps> = ({ sessionId }) => {
  const [state, setState] = useState<State>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Tenta buscar insight já gerado
        const insight = await strengthApi.getInsight(sessionId);
        if (!cancelled) setState({ phase: 'done', insight });
      } catch (err: any) {
        // 404 = ainda não gerado → gera agora
        if (err?.status === 404 || err?.message?.includes('404')) {
          if (!cancelled) setState({ phase: 'generating' });
          try {
            const insight = await strengthApi.generateInsight(sessionId);
            if (!cancelled) setState({ phase: 'done', insight });
          } catch (genErr: any) {
            if (!cancelled) {
              setState({ phase: 'error', message: 'Não foi possível gerar o insight agora.' });
            }
          }
        } else {
          if (!cancelled) {
            setState({ phase: 'error', message: 'Erro ao carregar o insight.' });
          }
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [sessionId]);

  async function handleRegenerate() {
    setState({ phase: 'generating' });
    try {
      const insight = await strengthApi.generateInsight(sessionId, true);
      setState({ phase: 'done', insight });
    } catch {
      setState({ phase: 'error', message: 'Falha ao regenerar o insight.' });
    }
  }

  return (
    <section
      aria-label="Insight de IA"
      className="flex flex-col gap-3 p-4 bg-[#0A0D1A] border border-[#A855F7]/30 rounded-[4px] relative overflow-hidden"
    >
      {/* Glow sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#A855F7]/5 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#A855F7]/20 border border-[#A855F7]/40">
            <svg className="w-3 h-3 text-[#A855F7]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 17.93V18a1 1 0 0 0-2 0v1.93A8 8 0 0 1 4.07 13H6a1 1 0 0 0 0-2H4.07A8 8 0 0 1 11 4.07V6a1 1 0 0 0 2 0V4.07A8 8 0 0 1 19.93 11H18a1 1 0 0 0 0 2h1.93A8 8 0 0 1 13 19.93z" />
            </svg>
          </span>
          <span className="font-mono text-[10px] text-[#A855F7] uppercase tracking-widest font-bold">
            Análise IA
          </span>
        </div>

        {state.phase === 'done' && (
          <button
            onClick={handleRegenerate}
            title="Regenerar insight"
            className="font-mono text-[9px] text-[#8F9380] uppercase tracking-wider hover:text-[#A855F7] transition-colors"
          >
            ↺ Regenerar
          </button>
        )}
      </div>

      {/* Conteúdo */}
      <div className="relative">
        {state.phase === 'loading' && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-[#A855F7]/60 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="font-mono text-xs text-[#8F9380]">Carregando…</span>
          </div>
        )}

        {state.phase === 'generating' && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-[#A855F7] rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="font-mono text-xs text-[#C5C8B4]">
              Analisando seu treino com IA…
            </span>
          </div>
        )}

        {state.phase === 'done' && (
          <p className="text-sm text-[#C5C8B4] leading-relaxed">
            {state.insight.content}
          </p>
        )}

        {state.phase === 'error' && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#8F9380]">{state.message}</p>
            <button
              onClick={handleRegenerate}
              className="font-mono text-[10px] text-[#A855F7] uppercase tracking-wider hover:underline ml-4 shrink-0"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
