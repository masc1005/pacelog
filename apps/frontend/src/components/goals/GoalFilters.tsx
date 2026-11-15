import React from 'react';
import { SPORT_KEYS, type SportKey } from '@pacelog/shared';
import {
  Activity,
  Flame,
  Sun,
  Zap,
  Dumbbell,
  Waves,
  Bike,
  Shield,
  Layers,
} from 'lucide-react';

const sportMeta: Record<SportKey, { name: string; color: string; icon: React.ElementType }> = {
  running: { name: 'Corrida', color: '#5CA9E6', icon: Activity },
  football: { name: 'Futebol', color: '#D4F684', icon: Flame },
  futevolei: { name: 'Futevôlei', color: '#FFB800', icon: Sun },
  boxing: { name: 'Boxe', color: '#FF6B35', icon: Zap },
  jiujitsu: { name: 'Jiu-Jitsu', color: '#E11D48', icon: Shield },
  strength: { name: 'Musculação', color: '#A855F7', icon: Dumbbell },
  swimming: { name: 'Natação', color: '#38BDF8', icon: Waves },
  cycling: { name: 'Ciclismo', color: '#10B981', icon: Bike },
};

export type GoalStatusFilter = 'all' | 'active' | 'paused' | 'completed';

interface GoalFiltersProps {
  statusFilter: GoalStatusFilter;
  onStatusChange: (status: GoalStatusFilter) => void;
  sportFilter: SportKey | 'all';
  onSportChange: (sport: SportKey | 'all') => void;
  counts: {
    all: number;
    active: number;
    paused: number;
    completed: number;
  };
}

export const GoalFilters: React.FC<GoalFiltersProps> = ({
  statusFilter,
  onStatusChange,
  sportFilter,
  onSportChange,
  counts,
}) => {
  const statusTabs: Array<{ id: GoalStatusFilter; label: string; count: number }> = [
    { id: 'all', label: 'Todas', count: counts.all },
    { id: 'active', label: 'Ativas', count: counts.active },
    { id: 'paused', label: 'Pausadas', count: counts.paused },
    { id: 'completed', label: 'Concluídas', count: counts.completed },
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* Pílulas enxutas de Status com contador discreto */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
        {statusTabs.map((tab) => {
          const isSelected = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onStatusChange(tab.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 h-7 px-3 rounded-full font-mono text-[11px] uppercase font-bold border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#D4F684] text-[#051424] border-[#D4F684]'
                  : 'bg-[#0D1C2D] text-[#8F9380] border-[#1F2937] hover:text-[#D4E4FA] hover:border-[#454839]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-normal ${
                  isSelected ? 'text-[#051424]/75' : 'text-[#8F9380]/75'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pílulas enxutas de Modalidade */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
        <button
          type="button"
          onClick={() => onSportChange('all')}
          className={`shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full font-mono text-[11px] uppercase font-bold border transition-all cursor-pointer ${
            sportFilter === 'all'
              ? 'bg-[#161C24] text-[#D4E4FA] border-[#D4F684]'
              : 'bg-[#0D1C2D] text-[#8F9380] border-[#1F2937] hover:text-[#D4E4FA] hover:border-[#454839]'
          }`}
        >
          <Layers className="w-3 h-3" />
          <span>Todas</span>
        </button>

        {SPORT_KEYS.map((key) => {
          const meta = sportMeta[key];
          const Icon = meta.icon;
          const isSelected = sportFilter === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSportChange(isSelected ? 'all' : key)}
              className={`shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full font-mono text-[11px] uppercase font-bold border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#161C24] text-[#D4E4FA] border-[#D4F684]'
                  : 'bg-[#0D1C2D] text-[#8F9380] border-[#1F2937] hover:text-[#D4E4FA] hover:border-[#454839]'
              }`}
            >
              <Icon
                className="w-3 h-3"
                style={{ color: isSelected ? meta.color : undefined }}
              />
              <span>{meta.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
