import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import type { SportProgressV2, ConfidenceLevel } from '@pacelog/shared';

// ==========================================
// HELPERS
// ==========================================

function formatMetricValue(value: number, unit: string, key: string): string {
  if (key === 'paceSecondsPerKm') {
    const mins = Math.floor(value / 60);
    const secs = Math.floor(value % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
  }
  if (key === 'totalVolumeKg' && value >= 1000) {
    return `${(value / 1000).toFixed(1)}t`;
  }
  if (unit === '%') return `${value.toFixed(0)}%`;
  if (unit === 'AU') return `${value} AU`;
  return `${value} ${unit}`;
}

function confidenceBadge(confidence: ConfidenceLevel): string {
  if (confidence === 'high') return 'text-[#D4F684]';
  if (confidence === 'medium') return 'text-[#F59E0B]';
  return 'text-[#8F9380]';
}

// ==========================================
// CARD INDIVIDUAL
// ==========================================

interface SportProgressCardProps {
  sport: SportProgressV2;
  onClick?: () => void;
}

const SportProgressCard: React.FC<SportProgressCardProps> = ({ sport, onClick }) => {
  const comparison = sport.comparison;
  const hasComparison = comparison !== null && sport.confidence !== 'low';

  const variationPercent = comparison?.relativeChangePercent ?? 0;
  const isImprovement = variationPercent > 0;
  const isNeutral = sport.primaryMetricDirection === 'neutral';

  const varColor = isNeutral ? 'text-[#D4E4FA]' : isImprovement ? 'text-[#D4F684]' : 'text-[#FF6B35]';
  const VarIcon = isNeutral ? Minus : isImprovement ? TrendingUp : TrendingDown;

  const currentValue = comparison?.currentValue ?? null;

  return (
    <div
      onClick={onClick}
      className={`bg-[#0D1C2D] border border-[#1F2937] rounded-2xl p-5 flex flex-col gap-3 transition-all ${onClick ? 'cursor-pointer hover:border-[#5CA9E6]' : ''}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="font-display text-base font-bold text-[#D4E4FA]">
            {sport.sportLabel}
          </p>
          <p className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest mt-0.5">
            {sport.primaryMetricLabel}
          </p>
        </div>
        <span className={`font-mono text-[10px] ${confidenceBadge(sport.confidence)}`}>
          {sport.sessionsCount} sessões
        </span>
      </div>

      {/* Valor atual */}
      {currentValue !== null ? (
        <div className="flex items-end gap-2">
          <span className="font-display text-2xl font-bold text-[#D4E4FA]">
            {formatMetricValue(currentValue, sport.primaryMetricUnit, sport.primaryMetricKey)}
          </span>
        </div>
      ) : (
        <span className="font-mono text-sm text-[#8F9380]">—</span>
      )}

      {/* Variação vs baseline */}
      {hasComparison && comparison && (
        <div className="flex items-center gap-2">
          <VarIcon className={`h-3.5 w-3.5 ${varColor}`} />
          <span className={`font-mono text-xs font-bold ${varColor}`}>
            {variationPercent > 0 ? '+' : ''}{variationPercent.toFixed(1)}% vs baseline
          </span>
          {isNeutral && (
            <span className="font-mono text-[9px] text-[#8F9380]">(variação)</span>
          )}
        </div>
      )}

      {/* Dados insuficientes */}
      {sport.confidence === 'low' && (
        <div className="flex items-center gap-2 text-[#8F9380]">
          <AlertCircle className="h-3 w-3" />
          <span className="font-mono text-[10px]">Dados insuficientes para comparar</span>
        </div>
      )}

      {/* Nota para musculação */}
      {sport.sportKey === 'strength' && hasComparison && variationPercent > 0 && (
        <p className="font-mono text-[9px] text-[#4A5568]">
          Aumento de volume não implica automaticamente melhora de força.
        </p>
      )}
    </div>
  );
};

// ==========================================
// GRID COMPLETO
// ==========================================

interface SportProgressSummaryProps {
  sports: SportProgressV2[];
  onSportClick?: (sportKey: string) => void;
}

/**
 * Grid de cards de progresso por esporte.
 * Cada card exibe a métrica principal do esporte com direção explícita.
 * Nunca compara métricas entre esportes (pace vs volume vs rounds).
 */
export const SportProgressSummary: React.FC<SportProgressSummaryProps> = ({
  sports,
  onSportClick,
}) => {
  if (sports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <AlertCircle className="h-8 w-8 text-[#8F9380]" />
        <p className="font-mono text-xs text-[#8F9380] uppercase">
          Nenhum esporte registrado no período
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {sports.map(sport => (
        <SportProgressCard
          key={sport.sportKey}
          sport={sport}
          onClick={onSportClick ? () => onSportClick(sport.sportKey) : undefined}
        />
      ))}
    </div>
  );
};
