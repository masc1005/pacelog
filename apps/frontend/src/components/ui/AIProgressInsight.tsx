import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Sparkles, BrainCircuit, Activity, TrendingUp, RotateCw } from 'lucide-react';
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

export const AIProgressInsight: React.FC = () => {
  const [data, setData] = useState<AIProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadInsight = async (force = false) => {
    try {
      if (force) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      const endpoint = force ? '/api/insights/daily?force=true' : '/api/insights/daily';
      const insight = await apiClient<AIInsightDTO>(endpoint);
      if (insight && insight.content) {
        const parsed = JSON.parse(insight.content);
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
      <Card variant="watch" className="p-5 flex items-center justify-center min-h-[160px] bg-[#051424]">
        <div className="flex flex-col items-center gap-3">
          <BrainCircuit className="h-6 w-6 text-[#5CA9E6] animate-pulse" />
          <span className="font-mono text-[10px] text-[#5CA9E6] uppercase tracking-widest animate-pulse">
            Analisando evolução...
          </span>
        </div>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card variant="watch" className="relative overflow-hidden group">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0D1C2D] to-[#051424] pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#5CA9E6] opacity-5 rounded-bl-full pointer-events-none blur-2xl" />

      <div className="relative p-5 sm:p-6 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          {/* Icon & Badge Area */}
          <div className="flex-shrink-0 flex flex-col gap-2">
            <div className="w-10 h-10 rounded-full bg-[#161C24] border border-[#5CA9E6]/30 flex items-center justify-center text-[#5CA9E6] shadow-[0_0_15px_rgba(92,169,230,0.15)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <Badge variant="cyan" size="sm" className="whitespace-nowrap font-mono text-[9px] uppercase tracking-widest mt-1 justify-center border-none bg-[#5CA9E6]/10 text-[#5CA9E6]">
              IA EVOLUÇÃO
            </Badge>
          </div>

          {/* Content Area */}
          <div className="flex flex-col gap-2 w-full">
            <h3 className="font-display text-xl font-bold text-[#D4E4FA] tracking-wide">
              {data.headline}
            </h3>
            <p className="font-sans text-sm text-[#C5C8B4] leading-relaxed">
              {data.summary}
            </p>
          </div>
        </div>

        {/* Top Progress Grid */}
        {data.topProgress && data.topProgress.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 border-t border-[#1F2937] pt-4">
            {data.topProgress.map((item, idx) => (
              <div key={idx} className="flex gap-3 items-start bg-[#0D1C2D]/50 border border-[#1F2937] p-3 rounded-[4px]">
                <div className="w-8 h-8 rounded-full bg-[#161C24] flex items-center justify-center flex-shrink-0 border border-[#1F2937]">
                  <TrendingUp className="w-4 h-4 text-[#D4F684]" />
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest truncate">
                      {SPORT_LABELS[item.sportKey] || item.sportKey} • {item.metric}
                    </span>
                    {item.variation && (
                      <span className="font-mono text-[10px] font-bold text-[#D4F684] bg-[#D4F684]/15 border border-[#D4F684]/30 px-2 py-0.5 rounded flex-shrink-0">
                        {item.variation}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-[#D4E4FA] leading-relaxed">
                    {item.description}
                  </span>
                  {(item.previousValue || item.currentValue || item.loadNote) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#1F2937]/50 font-mono text-[9px] text-[#8F9380]">
                      {item.previousValue && item.currentValue && (
                        <span>
                          {item.previousValue} → <strong className="text-[#D4E4FA]">{item.currentValue}</strong>
                        </span>
                      )}
                      {item.loadNote && (
                        <span className="text-[#8F9380] italic">
                          ({item.loadNote})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[#1F2937] pt-3 mt-1">
          <div className="flex items-center gap-1.5 text-[#8F9380]">
            <Activity className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px] uppercase tracking-wider">
              Motor Gemini IA
            </span>
          </div>
          <button
            type="button"
            onClick={() => loadInsight(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#5CA9E6] hover:text-[#D4E4FA] disabled:opacity-50 transition-colors cursor-pointer"
            title="Recalcular análise com dados recentes"
          >
            <RotateCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Recalculando...' : 'Recalcular'}</span>
          </button>
        </div>
      </div>
    </Card>
  );
};
