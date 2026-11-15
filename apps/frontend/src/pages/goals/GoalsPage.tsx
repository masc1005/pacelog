import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { GoalCard } from '../../components/goals/GoalCard';
import { GoalFilters, type GoalStatusFilter } from '../../components/goals/GoalFilters';
import { EmptyGoals } from '../../components/goals/EmptyGoals';
import { apiClient } from '../../lib/api';
import type { GoalDTO, SportKey } from '@pacelog/shared';
import { Plus, Target, CheckCircle2, TrendingUp } from 'lucide-react';

export const GoalsPage: React.FC = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<GoalDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<GoalStatusFilter>('active');
  const [sportFilter, setSportFilter] = useState<SportKey | 'all'>('all');

  const loadGoals = async () => {
    try {
      const data = await apiClient<GoalDTO[]>('/api/goals');
      setGoals(data);
    } catch (err) {
      console.error('Erro ao carregar metas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const counts = useMemo(() => {
    const active = goals.filter(
      (g) => g.status === 'active' && (g.progressPercent || 0) < 100
    ).length;
    const paused = goals.filter((g) => g.status === 'paused').length;
    const completed = goals.filter(
      (g) => g.status === 'completed' || g.status === 'achieved' || (g.progressPercent || 0) >= 100
    ).length;
    return {
      all: goals.length,
      active,
      paused,
      completed,
    };
  }, [goals]);

  const filteredGoals = useMemo(() => {
    return goals.filter((goal) => {
      if (statusFilter === 'active') {
        if (goal.status !== 'active' || (goal.progressPercent || 0) >= 100) return false;
      } else if (statusFilter === 'paused') {
        if (goal.status !== 'paused') return false;
      } else if (statusFilter === 'completed') {
        if (
          goal.status !== 'completed' &&
          goal.status !== 'achieved' &&
          (goal.progressPercent || 0) < 100
        )
          return false;
      }

      if (sportFilter !== 'all') {
        if (goal.sportKey !== sportFilter) return false;
      }

      return true;
    });
  }, [goals, statusFilter, sportFilter]);

  return (
    <div className="flex flex-col gap-4 font-sans max-w-5xl mx-auto w-full pb-24">
      {/* Header compacto */}
      <div className="flex items-center justify-between gap-3 border-b border-[#1F2937] pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[#D4F684]" />
          <h1 className="font-display text-xl sm:text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
            Metas
          </h1>
        </div>

        <Button
          variant="tactile"
          size="sm"
          onClick={() => navigate('/goals/new')}
          leftIcon={<Plus className="h-4 w-4" />}
          className="font-mono text-xs uppercase tracking-wider shrink-0"
        >
          Nova Meta
        </Button>
      </div>

      {/* Resumo compacto */}
      <div className="grid grid-cols-3 gap-2">
        <div className="px-3 py-2 bg-[#0D1C2D] border border-[#1F2937] rounded-[4px] flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#5CA9E6] shrink-0" />
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="font-display text-base font-bold text-[#D4E4FA]">{counts.active}</span>
            <span className="font-mono text-[9px] text-[#8F9380] uppercase truncate">Ativas</span>
          </div>
        </div>

        <div className="px-3 py-2 bg-[#0D1C2D] border border-[#1F2937] rounded-[4px] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#D4F684] shrink-0" />
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="font-display text-base font-bold text-[#D4F684]">{counts.completed}</span>
            <span className="font-mono text-[9px] text-[#8F9380] uppercase truncate">Concluídas</span>
          </div>
        </div>

        <div className="px-3 py-2 bg-[#0D1C2D] border border-[#1F2937] rounded-[4px] flex items-center gap-2">
          <Target className="w-4 h-4 text-[#A855F7] shrink-0" />
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="font-display text-base font-bold text-[#D4E4FA]">{counts.all}</span>
            <span className="font-mono text-[9px] text-[#8F9380] uppercase truncate">Total</span>
          </div>
        </div>
      </div>

      {/* Filtros horizontais */}
      <GoalFilters
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        sportFilter={sportFilter}
        onSportChange={setSportFilter}
        counts={counts}
      />

      {/* Conteúdo Principal */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-pulse">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 bg-[#0D1C2D] border border-[#1F2937] rounded-[4px]" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyGoals variant="no-goals" />
      ) : filteredGoals.length === 0 ? (
        <EmptyGoals
          variant="no-results"
          onResetFilters={() => {
            setStatusFilter('all');
            setSportFilter('all');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
};
