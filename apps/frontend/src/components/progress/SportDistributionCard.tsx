import React from 'react';
import type { SportKey } from '@pacelog/shared';
import { SPORT_LABELS } from '../../lib/utils';

// ==========================================
// TIPOS
// ==========================================

export type SportDistributionItem = {
  sportKey: SportKey;
  sportLabel: string;
  srpe: number;
  sharePercent: number;
};

const SPORT_COLORS: Record<string, string> = {
  running: '#5CA9E6',
  football: '#D4F684',
  futevolei: '#F59E0B',
  boxing: '#FF6B35',
  strength: '#A78BFA',
};

// ==========================================
// COMPONENTE
// ==========================================

interface SportDistributionCardProps {
  distribution: SportDistributionItem[];
  totalSrpe: number;
  className?: string;
}

/**
 * Distribuição de carga por esporte.
 * Não implica hierarquia entre modalidades — apenas mostra distribuição proporcional.
 */
export const SportDistributionCard: React.FC<SportDistributionCardProps> = ({
  distribution,
  totalSrpe,
  className = '',
}) => {
  if (distribution.length === 0) {
    return (
      <div className={`bg-[#0D1C2D] border border-[#1F2937] rounded-2xl p-6 ${className}`}>
        <p className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest mb-4">
          Distribuição por modalidade
        </p>
        <p className="font-mono text-xs text-[#4A5568]">
          Nenhuma sessão registrada no período.
        </p>
      </div>
    );
  }

  const sorted = [...distribution].sort((a, b) => b.srpe - a.srpe);

  return (
    <div className={`bg-[#0D1C2D] border border-[#1F2937] rounded-2xl p-6 flex flex-col gap-5 ${className}`}>
      {/* Header */}
      <div>
        <p className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest">
          Distribuição por modalidade
        </p>
        <p className="font-mono text-[10px] text-[#4A5568] mt-0.5">
          Carga percebida — sem comparação entre esportes
        </p>
      </div>

      {/* Barra total proporcional */}
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        {sorted.map(s => (
          <div
            key={s.sportKey}
            style={{
              width: `${s.sharePercent}%`,
              backgroundColor: SPORT_COLORS[s.sportKey] ?? '#8F9380',
            }}
            className="h-full"
            title={`${s.sportLabel}: ${s.sharePercent}%`}
          />
        ))}
      </div>

      {/* Linhas por esporte */}
      <div className="flex flex-col gap-3">
        {sorted.map(s => {
          const color = SPORT_COLORS[s.sportKey] ?? '#8F9380';
          return (
            <div key={s.sportKey} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="font-display text-sm font-bold text-[#D4E4FA] flex-1">
                {SPORT_LABELS[s.sportKey] || s.sportLabel}
              </span>
              <span className="font-mono text-xs text-[#D4E4FA]">{s.srpe} AU</span>
              <span className="font-mono text-xs text-[#8F9380] w-10 text-right">{s.sharePercent}%</span>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="flex justify-between items-center border-t border-[#1F2937] pt-3">
        <span className="font-mono text-[10px] text-[#8F9380] uppercase">Total</span>
        <span className="font-mono text-sm font-bold text-[#D4E4FA]">{totalSrpe} AU</span>
      </div>
    </div>
  );
};
