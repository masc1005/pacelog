import React from 'react';
import type { GearUsage } from '@pacelog/shared';

interface GearUsageBarProps {
  usage: GearUsage;
  label?: string;
}

export const GearUsageBar: React.FC<GearUsageBarProps> = ({ usage, label = 'Uso' }) => {
  if (usage.status === 'unlimited' || usage.limit === null || usage.percent === null) {
    return null;
  }

  const percentage = Math.min(100, Math.max(0, usage.percent));

  let colorClass = 'bg-[#38BDF8]'; // Azul (Saudável)
  let textColor = '#8F9380';

  if (usage.status === 'over_limit') {
    colorClass = 'bg-[#EF4444]';
    textColor = '#EF4444';
  } else if (usage.status === 'near_limit') {
    colorClass = 'bg-[#F59E0B]';
    textColor = '#F59E0B';
  }

  return (
    <div className="w-full mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider">
          {label}
        </span>
        <span className="font-mono text-[10px] font-bold" style={{ color: textColor }}>
          {usage.used.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} /{' '}
          {usage.limit.toLocaleString('pt-BR')} {usage.unit} ({Math.round(usage.percent)}%)
        </span>
      </div>
      <div className="h-1.5 w-full bg-[#161C24] rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

/** Alias legado */
export const ShoeUsageBar: React.FC<{ accumulatedDistanceKm: number; distanceLimitKm?: number }> = ({
  accumulatedDistanceKm,
  distanceLimitKm,
}) => {
  if (!distanceLimitKm || distanceLimitKm <= 0) return null;
  const percent = (accumulatedDistanceKm / distanceLimitKm) * 100;
  return (
    <GearUsageBar
      usage={{
        unit: 'km',
        used: accumulatedDistanceKm,
        limit: distanceLimitKm,
        remaining: Math.max(0, distanceLimitKm - accumulatedDistanceKm),
        percent,
        status: percent >= 100 ? 'over_limit' : percent >= 75 ? 'near_limit' : 'normal',
      }}
      label="Uso do Tênis"
    />
  );
};
