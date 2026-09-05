import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Sparkles, BrainCircuit, Activity } from 'lucide-react';
import { apiClient } from '../../lib/api';
import type { AIInsightDTO } from '@pacelog/shared';

export const AICoachWidget: React.FC = () => {
  const [insight, setInsight] = useState<AIInsightDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadInsight() {
      try {
        const data = await apiClient<AIInsightDTO>('/api/insights/daily');
        setInsight(data);
      } catch (error) {
        console.error('Failed to load AI Insight', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadInsight();
  }, []);

  if (isLoading) {
    return (
      <Card variant="watch" className="p-5 flex items-center justify-center min-h-[120px] bg-[#051424]">
        <div className="flex flex-col items-center gap-3">
          <BrainCircuit className="h-6 w-6 text-[#5CA9E6] animate-pulse" />
          <span className="font-mono text-[10px] text-[#5CA9E6] uppercase tracking-widest animate-pulse">
            Analisando telemetria...
          </span>
        </div>
      </Card>
    );
  }

  if (!insight) return null;

  return (
    <Card variant="watch" className="relative overflow-hidden group">
      {/* Background Gradient matching the Tactical/Neon aesthetic */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0D1C2D] to-[#051424] pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4F684] opacity-5 rounded-bl-full pointer-events-none blur-2xl" />

      <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row gap-5 items-start">
        {/* Icon & Badge Area */}
        <div className="flex-shrink-0 flex flex-col gap-2">
          <div className="w-10 h-10 rounded-full bg-[#161C24] border border-[#D4F684]/30 flex items-center justify-center text-[#D4F684] shadow-[0_0_15px_rgba(212,246,132,0.15)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <Badge variant="sage" size="sm" className="whitespace-nowrap font-mono text-[9px] uppercase tracking-widest mt-1 justify-center border-none bg-[#D4F684]/10 text-[#D4F684]">
            IA TÁTICA
          </Badge>
        </div>

        {/* Content Area */}
        <div className="flex flex-col gap-2 w-full">
          <h3 className="font-display text-lg font-bold text-[#D4E4FA] flex items-center gap-2 tracking-wide">
            Análise Diária de Performance
          </h3>
          <p className="font-sans text-sm text-[#C5C8B4] leading-relaxed">
            {insight.content}
          </p>

          <div className="flex items-center gap-4 mt-3 border-t border-[#1F2937] pt-3">
            <div className="flex items-center gap-1.5 text-[#8F9380]">
              <Activity className="h-3.5 w-3.5" />
              <span className="font-mono text-[10px] uppercase tracking-wider">
                Motor Gemini IA
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
