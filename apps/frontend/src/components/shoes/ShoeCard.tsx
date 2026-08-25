import React from 'react';
import type { RunningShoe } from '@pacelog/shared';
import { Card } from '../ui/Card';
import { Footprints, Calendar, Edit3 } from 'lucide-react';
import { ShoeUsageBar } from './ShoeUsageBar';
import { ShoeStatusBadge } from './ShoeStatusBadge';

interface ShoeCardProps {
  shoe: RunningShoe;
  onEdit?: (shoe: RunningShoe) => void;
  onClick?: (shoe: RunningShoe) => void;
}

export const ShoeCard: React.FC<ShoeCardProps> = ({ shoe, onEdit, onClick }) => {
  return (
    <Card 
      className={`p-4 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-3 ${onClick ? 'cursor-pointer hover:border-[#454839] transition-colors' : ''}`}
      onClick={() => onClick && onClick(shoe)}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#38BDF8]/10 flex items-center justify-center flex-shrink-0">
            <Footprints className="w-5 h-5 text-[#38BDF8]" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-display text-lg font-bold text-[#D4E4FA] uppercase tracking-wide leading-tight">
              {shoe.model}
            </h3>
            {shoe.brand && (
              <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest">
                {shoe.brand}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <ShoeStatusBadge status={shoe.status} isDefault={shoe.isDefault} />
          {onEdit && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit(shoe);
              }}
              className="text-[#8F9380] hover:text-[#D4E4FA] transition-colors p-1"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <ShoeUsageBar accumulatedDistanceKm={shoe.accumulatedDistanceKm} distanceLimitKm={shoe.distanceLimitKm} />
        
        <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-[#1F2937]/50">
          <div className="flex flex-col">
            <span className="font-mono text-[9px] text-[#8F9380] uppercase">Uso Atual</span>
            <span className="font-mono text-sm font-bold text-[#D4E4FA]">{shoe.accumulatedDistanceKm.toFixed(1)} km</span>
          </div>
          {shoe.purchaseDate && (
            <div className="flex flex-col items-end">
              <span className="font-mono text-[9px] text-[#8F9380] uppercase">Adquirido em</span>
              <span className="font-mono text-xs text-[#C5C8B4] flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(shoe.purchaseDate).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
