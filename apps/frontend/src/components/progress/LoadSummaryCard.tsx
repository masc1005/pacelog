import React from 'react';
import type { LoadSummary, ConfidenceLevel, LoadVariationStatus } from '@pacelog/shared';

// ==========================================
// HELPERS DE FORMATAÇÃO
// ==========================================

function formatAU(value: number): string {
  if (value >= 10000) return `${(value / 1000).toFixed(1)}k`;
  return Math.round(value).toLocaleString('pt-BR');
}

function variationColor(status: LoadVariationStatus): string {
  if (status === 'insufficient_data') return 'text-[#8F9380]';
  if (status === 'stable') return 'text-[#D4E4FA]';
  if (status === 'elevated_vs_baseline') return 'text-[#F59E0B]';
  if (status === 'below_baseline') return 'text-[#5CA9E6]';
  return 'text-[#D4E4FA]';
}

function confidenceBadge(confidence: ConfidenceLevel): { label: string; color: string } {
  const map: Record<ConfidenceLevel, { label: string; color: string }> = {
    low: { label: 'Confiança baixa', color: 'text-[#8F9380] border-[#8F9380]' },
    medium: { label: 'Confiança média', color: 'text-[#F59E0B] border-[#F59E0B]' },
    high: { label: 'Confiança alta', color: 'text-[#D4F684] border-[#D4F684]' },
  };
  return map[confidence];
}

// ==========================================
// COMPONENTE
// ==========================================

interface LoadSummaryCardProps {
  load: LoadSummary;
  className?: string;
}

/**
 * Card de carga percebida — sempre exibe valor com baseline e confiança.
 * Nunca exibe "métrica alta" sem contexto.
 */
export const LoadSummaryCard: React.FC<LoadSummaryCardProps> = ({ load, className = '' }) => {
  const varColor = variationColor(load.status);
  const badge = confidenceBadge(load.confidence);

  return (
    <div className={`bg-[#0D1C2D] border border-[#1F2937] rounded-2xl p-6 flex flex-col gap-4 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest">
            Carga percebida
          </p>
          <p className="font-mono text-[10px] text-[#4A5568] mt-0.5">
            sRPE-TL · {load.unit}
          </p>
        </div>
        <span className={`font-mono text-[10px] border rounded-full px-2 py-0.5 ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {/* Valor principal */}
      <div className="flex items-end gap-3">
        <span className="font-display text-5xl font-bold text-[#D4E4FA]">
          {formatAU(load.currentSrpe)}
        </span>
        <span className="font-mono text-sm text-[#8F9380] mb-1">{load.unit}</span>
      </div>

      {/* Variação vs baseline */}
      {load.confidence !== 'low' && load.baselineSrpe > 0 && (
        <div className="flex items-center gap-2">
          <span className={`font-display text-xl font-bold ${varColor}`}>
            {load.variationPercent > 0 ? '+' : ''}{load.variationPercent.toFixed(1)}%
          </span>
          <span className="font-mono text-xs text-[#8F9380]">
            versus {load.windowLabel ? (load.windowLabel.includes('semana') ? load.windowLabel : `sua média ${load.windowLabel}`) : 'semana passada'} ({formatAU(load.baselineSrpe)} {load.unit})
          </span>
        </div>
      )}

      {/* Status message */}
      <p className="font-sans text-sm text-[#8F9380] leading-relaxed">
        {load.statusMessage}
      </p>

      {/* Disclaimer */}
      <p className="font-mono text-[9px] text-[#4A5568] leading-relaxed border-t border-[#1F2937] pt-3">
        {load.disclaimer}
      </p>
    </div>
  );
};
