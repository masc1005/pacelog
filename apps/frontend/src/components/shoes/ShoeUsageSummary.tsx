import React from 'react';
import { Card } from '../ui/Card';
import { Footprints, ChevronRight } from 'lucide-react';
import type { RunningShoe } from '@pacelog/shared';
import { ShoeUsageBar } from './ShoeUsageBar';
import { useNavigate } from 'react-router-dom';

interface ShoeUsageSummaryProps {
  defaultShoe?: RunningShoe;
  activeShoesCount: number;
}

export const ShoeUsageSummary: React.FC<ShoeUsageSummaryProps> = ({ defaultShoe, activeShoesCount }) => {
  const navigate = useNavigate();

  return (
    <Card 
      className="p-4 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-3 cursor-pointer hover:border-[#454839] transition-colors"
      onClick={() => navigate('/shoes')}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-[#C5C8B4]">
          <Footprints className="w-4 h-4 text-[#38BDF8]" />
          <h3 className="font-mono text-xs uppercase tracking-widest font-bold">Tracker de Tênis</h3>
        </div>
        <div className="flex items-center gap-2">
          {activeShoesCount > 0 && (
            <span className="font-mono text-[9px] text-[#8F9380] bg-[#161C24] px-1.5 py-0.5 rounded border border-[#1F2937]">
              {activeShoesCount} ATIVO{activeShoesCount > 1 ? 'S' : ''}
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-[#8F9380]" />
        </div>
      </div>

      {defaultShoe ? (
        <div className="flex flex-col gap-1 mt-1">
          <div className="flex justify-between items-end">
            <span className="font-display text-lg font-bold text-[#D4E4FA] uppercase tracking-wide">
              {defaultShoe.model}
            </span>
            <span className="font-mono text-xs text-[#8F9380] bg-[#D4F684]/10 text-[#D4F684] px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest border border-[#D4F684]/20">
              Padrão
            </span>
          </div>
          <ShoeUsageBar 
            accumulatedDistanceKm={defaultShoe.accumulatedDistanceKm} 
            distanceLimitKm={defaultShoe.distanceLimitKm} 
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-4 bg-[#051424] rounded border border-[#1F2937] border-dashed">
          <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest">
            Nenhum tênis cadastrado
          </span>
          <span className="font-mono text-xs text-[#D4E4FA] mt-1 underline decoration-[#38BDF8]/50 underline-offset-4">
            Adicionar Tênis
          </span>
        </div>
      )}
    </Card>
  );
};
