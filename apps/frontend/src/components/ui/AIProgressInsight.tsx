import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Sparkles, BrainCircuit, TrendingUp, RotateCw, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { SPORT_LABELS } from '../../lib/utils';
import type { AIInsightDTO } from '@pacelog/shared';

type AIProgressData = {
  headline: string;
  summary: string;
  hasEvolution?: boolean;
  topProgress: Array<{
    sportKey: string;
    metric: string;
    previousValue?: string | null;
    currentValue?: string | null;
    variation?: string | null;
    loadNote?: string | null;
    description: string;
  }>;
};

function parseProgressInsight(content: string): AIProgressData | null {
  const source = content.trim();
  if (!source) return null;

  const jsonSource = source
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  if (jsonSource.startsWith('{')) {
    try {
      const parsed = JSON.parse(jsonSource) as Partial<AIProgressData>;
      const headline =
        typeof parsed.headline === 'string' && parsed.headline.trim()
          ? parsed.headline.trim()
          : typeof parsed.summary === 'string' && parsed.summary.trim()
            ? parsed.summary.trim()
            : '';

      if (headline) {
        return {
          headline,
          summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : headline,
          hasEvolution: parsed.hasEvolution,
          topProgress: Array.isArray(parsed.topProgress) ? parsed.topProgress : [],
        };
      }
    } catch {
      // Conteúdo truncado: usa a extração tolerante abaixo.
    }
  }

  const headlineMatch = jsonSource.match(/"headline"\s*:\s*"([\s\S]*?)(?:"\s*[,}]|$)/i);
  const summaryMatch = jsonSource.match(/"summary"\s*:\s*"([\s\S]*?)(?:"\s*[,}]|$)/i);

  const extractedHeadline = headlineMatch?.[1]?.replace(/\\"/g, '"').trim();
  const extractedSummary = summaryMatch?.[1]?.replace(/\\"/g, '"').trim();

  if (extractedHeadline || extractedSummary) {
    return {
      headline: extractedHeadline || extractedSummary || '',
      summary: extractedSummary || extractedHeadline || '',
      topProgress: [],
    };
  }

  const fallbackText = jsonSource
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/^\{\s*"headline"\s*:\s*"/i, '')
    .replace(/"\s*,?\s*"[^"]*"\s*:\s*[\s\S]*\}?$/i, '')
    .replace(/[{}\"]/g, '')
    .trim();

  if (!fallbackText) return null;

  return {
    headline: fallbackText,
    summary: fallbackText,
    topProgress: [],
  };
}

export const AIProgressInsight: React.FC = () => {
  const [data, setData] = useState<AIProgressData | null>(null);
  const [modelUsed, setModelUsed] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadInsight = async (force = false) => {
    try {
      if (force) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      const endpoint = force ? '/api/insights/daily?force=true' : '/api/insights/daily';
      const insight = await apiClient<AIInsightDTO>(endpoint);
      if (insight) {
        setModelUsed(insight.modelUsed);
        console.info(
          `[Gemini AI] Daily Progress Insight — model executed: ${insight.modelUsed ?? 'cache / deterministic'}`
        );
      }
      if (insight && insight.content) {
        const parsed = parseProgressInsight(insight.content);
        setData(parsed);
      }
    } catch (error) {
      console.error('Failed to load AI Progress Insight', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadInsight();
  }, []);

  if (isLoading) {
    return (
      <Card
        variant="watch"
        className="px-3.5 py-2.5 flex items-center gap-2.5 bg-[#0D1C2D] border-[#1F2937] rounded-xl"
      >
        <BrainCircuit className="h-4 w-4 text-[#5CA9E6] animate-pulse shrink-0" />
        <span className="font-mono text-[10px] text-[#5CA9E6] uppercase tracking-widest animate-pulse">
          Analisando evolução...
        </span>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card
      variant="watch"
      className="relative overflow-hidden bg-[#0D1C2D] border-[#5CA9E6]/30 rounded-xl p-0"
    >
      {/* Banner recolhível de 1 linha */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
        className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer hover:bg-[#161C24]/60 transition-colors"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-[#5CA9E6]" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#5CA9E6] shrink-0">
          IA
        </span>
        <p className="font-sans text-xs text-[#D4E4FA] truncate flex-1 min-w-0">
          {data.headline}
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            loadInsight(true);
          }}
          disabled={isRefreshing}
          title="Recalcular análise"
          aria-label="Recalcular análise"
          className="p-1 text-[#8F9380] hover:text-[#5CA9E6] disabled:opacity-50 transition-colors shrink-0"
        >
          <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        <span className="text-[#8F9380] shrink-0">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </div>

      {/* Detalhes expandidos */}
      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-2 border-t border-[#1F2937] flex flex-col gap-3">
          {data.summary && (
            <p className="font-sans text-xs text-[#C5C8B4] leading-relaxed">
              {data.summary}
            </p>
          )}

          {data.topProgress && data.topProgress.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.topProgress.map((item, idx) => (
                <div
                  key={idx}
                  className="flex gap-2.5 items-start bg-[#161C24] border border-[#1F2937] p-2.5 rounded-[4px]"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-[#D4F684] mt-0.5 shrink-0" />
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-[#8F9380] uppercase truncate">
                        {SPORT_LABELS[item.sportKey] || item.sportKey} • {item.metric}
                      </span>
                      {item.variation && (
                        <span className="font-mono text-[10px] font-bold text-[#D4F684] shrink-0">
                          {item.variation}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#D4E4FA] leading-snug">
                      {item.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {modelUsed && (
            <div className="font-mono text-[9px] text-[#8F9380] uppercase tracking-wider">
              Motor Gemini IA • {modelUsed}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
