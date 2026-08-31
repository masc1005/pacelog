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

  // Filtros
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

  // Contagens para as abas
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

  // Metas filtradas
  const filteredGoals = useMemo(() => {
    return goals.filter((goal) => {
      // Filtro de Status
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

      // Filtro de Esporte
      if (sportFilter !== 'all') {
        if (goal.sportKey !== sportFilter) return false;
      }

      return true;
    });
  }, [goals, statusFilter, sportFilter]);

  return (
    <div className="flex flex-col gap-6 font-sans max-w-5xl mx-auto w-full pb-16">
      {/* Header com Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-6 h-6 text-[#D4F684]" />
            <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
              Metas & Marcos
            </h1>
          </div>
          <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase">
            Acompanhamento de alvos de volume, tempo e performance tática
          </p>
        </div>

        <Button
          variant="tactile"
          size="sm"
          onClick={() => navigate('/goals/new')}
          leftIcon={<Plus className="h-4 w-4" />}
          className="font-mono text-xs uppercase tracking-wider self-start sm:self-auto"
        >
          Nova Meta
        </Button>
      </div>

      {/* Resumo Rápido em Cards Táticos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-[#0D1C2D] border border-[#1F2937] rounded-[4px] flex items-center gap-3">
          <div className="w-8 h-8 rounded-[4px] bg-[#5CA9E6]/10 border border-[#5CA9E6]/30 flex items-center justify-center text-[#5CA9E6]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider">
              Em Andamento
            </span>
            <span className="font-display text-lg font-bold text-[#D4E4FA]">
              {counts.active}
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-[#0D1C2D] border border-[#1F2937] rounded-[4px] flex items-center gap-3">
          <div className="w-8 h-8 rounded-[4px] bg-[#D4F684]/10 border border-[#D4F684]/30 flex items-center justify-center text-[#D4F684]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider">
              Concluídas
            </span>
            <span className="font-display text-lg font-bold text-[#D4F684]">
              {counts.completed}
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-[#0D1C2D] border border-[#1F2937] rounded-[4px] hidden sm:flex items-center gap-3">
          <div className="w-8 h-8 rounded-[4px] bg-[#A855F7]/10 border border-[#A855F7]/30 flex items-center justify-center text-[#A855F7]">
            <Target className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider">
              Total de Metas
            </span>
            <span className="font-display text-lg font-bold text-[#D4E4FA]">
              {counts.all}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <GoalFilters
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        sportFilter={sportFilter}
        onSportChange={setSportFilter}
        counts={counts}
      />

      {/* Conteúdo Principal */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-40 bg-[#0D1C2D] border border-[#1F2937] rounded-[4px]" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
};
