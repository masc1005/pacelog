import React from 'react';

interface ShoeUsageBarProps {
  accumulatedDistanceKm: number;
  distanceLimitKm?: number;
}

export const ShoeUsageBar: React.FC<ShoeUsageBarProps> = ({ accumulatedDistanceKm, distanceLimitKm }) => {
  if (!distanceLimitKm || distanceLimitKm <= 0) return null;

  const percentage = Math.min(100, (accumulatedDistanceKm / distanceLimitKm) * 100);
  
  let colorClass = 'bg-[#38BDF8]'; // Azul (Saudável)
  if (percentage >= 90) colorClass = 'bg-[#EF4444]'; // Vermelho (Crítico)
  else if (percentage >= 75) colorClass = 'bg-[#F59E0B]'; // Laranja (Aviso)

  return (
    <div className="w-full mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="font-mono text-[10px] text-[#8F9380] uppercase">Uso do Tênis</span>
        <span className="font-mono text-[10px] font-bold" style={{ color: percentage >= 90 ? '#EF4444' : percentage >= 75 ? '#F59E0B' : '#8F9380' }}>
          {percentage.toFixed(0)}%
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
