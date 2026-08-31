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

const sportMeta: Record<SportKey, { name: string; color: string; icon: any }> = {
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
    { id: 'active', label: 'Em Andamento', count: counts.active },
    { id: 'paused', label: 'Pausadas', count: counts.paused },
    { id: 'completed', label: 'Concluídas', count: counts.completed },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Abas de Status */}
      <div className="flex items-center gap-2 border-b border-[#1F2937] overflow-x-auto no-scrollbar pb-1">
        {statusTabs.map((tab) => {
          const isSelected = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onStatusChange(tab.id)}
              className={`flex items-center gap-2 py-2 px-3.5 font-mono text-xs uppercase font-bold tracking-wider rounded-t-[4px] border-b-2 transition-all whitespace-nowrap ${
                isSelected
                  ? 'border-[#D4F684] text-[#D4F684] bg-[#D4F684]/5'
                  : 'border-transparent text-[#8F9380] hover:text-[#D4E4FA] hover:bg-white/5'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected
                    ? 'bg-[#D4F684] text-[#051424]'
                    : 'bg-[#161C24] text-[#8F9380]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pílulas de Modalidade Esportiva */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={() => onSportChange('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] font-mono text-xs uppercase font-bold transition-all border whitespace-nowrap ${
            sportFilter === 'all'
              ? 'bg-[#D4F684] text-[#051424] border-[#D4F684] shadow-[0_0_12px_rgba(212,246,132,0.25)]'
              : 'bg-[#161C24] text-[#8F9380] border-[#1F2937] hover:border-[#454839] hover:text-[#D4E4FA]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Todas as Modalidades</span>
        </button>

        {SPORT_KEYS.map((key) => {
          const meta = sportMeta[key];
          const Icon = meta.icon;
          const isSelected = sportFilter === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSportChange(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] font-mono text-xs uppercase font-bold transition-all border whitespace-nowrap ${
                isSelected
                  ? 'bg-[#161C24] text-[#D4E4FA] border-[#D4F684] shadow-[0_0_12px_rgba(212,246,132,0.15)]'
                  : 'bg-[#161C24] text-[#8F9380] border-[#1F2937] hover:border-[#454839] hover:text-[#D4E4FA]'
              }`}
            >
              <Icon
                className="w-3.5 h-3.5"
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
