import React, { useEffect, useState } from 'react';
import { strengthApi } from '../../../services/strength.api';
import type { AIInsightDTO } from '@pacelog/shared';

interface StrengthInsightCardProps {
  sessionId: string;
  compact?: boolean;
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
export const StrengthInsightCard: React.FC<StrengthInsightCardProps> = ({
  sessionId,
  compact = false,
}) => {
  const [state, setState] = useState<State>({ phase: 'loading' });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const insight = await strengthApi.getInsight(sessionId);
        console.info(`[Gemini AI] Strength Session Insight — model executed: ${insight.modelUsed ?? 'cached'}`);
        if (!cancelled) setState({ phase: 'done', insight });
      } catch (err: any) {
        if (err?.status === 404 || err?.message?.includes('404')) {
          if (!cancelled) setState({ phase: 'generating' });
          try {
            const insight = await strengthApi.generateInsight(sessionId);
            console.info(`[Gemini AI] Strength Session Insight generated — model executed: ${insight.modelUsed ?? 'unknown'}`);
            if (!cancelled) setState({ phase: 'done', insight });
          } catch {
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
      console.info(`[Gemini AI] Strength Session Insight regenerated — model executed: ${insight.modelUsed ?? 'unknown'}`);
      setState({ phase: 'done', insight });
    } catch {
      setState({ phase: 'error', message: 'Falha ao regenerar o insight.' });
    }
  }

  return (
    <section
      aria-label="Insight de IA"
      className={`flex flex-col ${compact ? 'gap-2 p-3' : 'gap-3 p-4'} bg-[#0A0D1A] border border-[#A855F7]/30 rounded-[4px] relative overflow-hidden`}
    >
      {/* Glow sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#A855F7]/5 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between relative gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#A855F7]/20 border border-[#A855F7]/40 shrink-0">
            <svg className="w-2.5 h-2.5 text-[#A855F7]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 17.93V18a1 1 0 0 0-2 0v1.93A8 8 0 0 1 4.07 13H6a1 1 0 0 0 0-2H4.07A8 8 0 0 1 11 4.07V6a1 1 0 0 0 2 0V4.07A8 8 0 0 1 19.93 11H18a1 1 0 0 0 0 2h1.93A8 8 0 0 1 13 19.93z" />
            </svg>
          </span>
          <span className="font-mono text-[10px] text-[#A855F7] uppercase tracking-widest font-bold truncate">
            Análise IA{!compact && state.phase === 'done' && state.insight.modelUsed ? ` • ${state.insight.modelUsed}` : ''}
          </span>
        </div>

        {state.phase === 'done' && (
          <div className="flex items-center gap-2 shrink-0">
            {compact && (
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="font-mono text-[9px] text-[#5CA9E6] uppercase tracking-wider hover:underline"
              >
                {expanded ? 'Recolher' : 'Ver mais'}
              </button>
            )}
            <button
              type="button"
              onClick={handleRegenerate}
              title="Regenerar insight"
              className="font-mono text-[9px] text-[#8F9380] uppercase tracking-wider hover:text-[#A855F7] transition-colors"
            >
              ↺
            </button>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="relative">
        {state.phase === 'loading' && (
          <span className="font-mono text-[11px] text-[#8F9380] animate-pulse">
            Carregando análise…
          </span>
        )}

        {state.phase === 'generating' && (
          <span className="font-mono text-[11px] text-[#C5C8B4] animate-pulse">
            Analisando seu treino com IA…
          </span>
        )}

        {state.phase === 'done' && (
          <p
            className={`${compact ? 'text-xs leading-snug' : 'text-sm leading-relaxed'} text-[#C5C8B4] ${
              compact && !expanded ? 'line-clamp-2' : ''
            }`}
          >
            {state.insight.content}
          </p>
        )}

        {state.phase === 'error' && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#8F9380]">{state.message}</p>
            <button
              type="button"
              onClick={handleRegenerate}
              className="font-mono text-[10px] text-[#A855F7] uppercase tracking-wider hover:underline shrink-0"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
