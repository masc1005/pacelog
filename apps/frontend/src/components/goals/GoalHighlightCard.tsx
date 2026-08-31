import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { GoalProgressBar } from './GoalProgressBar';
import { apiClient } from '../../lib/api';
import type { GoalDTO, SportKey } from '@pacelog/shared';
import {
  Target,
  ChevronRight,
  Clock,
  Activity,
  Flame,
  Sun,
  Zap,
  Dumbbell,
  Waves,
  Bike,
  Shield,
  Plus,
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

export const GoalHighlightCard: React.FC = () => {
  const navigate = useNavigate();
  const [highlightGoal, setHighlightGoal] = useState<GoalDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFeaturedGoal() {
      try {
        const goals = await apiClient<GoalDTO[]>('/api/goals?status=active');
        if (goals.length > 0) {
          // Prioriza meta ativa com deadline mais próxima; senão, maior progressPercent
          const sorted = [...goals].sort((a, b) => {
            if (a.deadline && b.deadline) {
              return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            }
            if (a.deadline) return -1;
            if (b.deadline) return 1;
            return (b.progressPercent || 0) - (a.progressPercent || 0);
          });
          setHighlightGoal(sorted[0]);
        } else {
          setHighlightGoal(null);
        }
      } catch {
        // Silencioso em caso de inicialização offline
      } finally {
        setIsLoading(false);
      }
    }
    loadFeaturedGoal();
  }, []);

  if (isLoading) return null;

  if (!highlightGoal) {
    return (
      <Card
        variant="watch"
        className="p-4 bg-[#0D1C2D]/70 border-[#1F2937] hover:border-[#D4F684]/30 cursor-pointer transition-all duration-200 flex items-center justify-between"
        onClick={() => navigate('/goals/new')}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[4px] bg-[#161C24] border border-[#1F2937] flex items-center justify-center text-[#D4F684]">
            <Target className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xs font-bold text-[#D4E4FA] uppercase">
              Definir Meta Tática
            </span>
            <span className="font-mono text-[10px] text-[#8F9380]">
              Estabeleça um alvo de volume, tempo ou consistência
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px] text-[#D4F684] uppercase font-bold">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Criar</span>
        </div>
      </Card>
    );
  }

  const meta = highlightGoal.sportKey ? sportMeta[highlightGoal.sportKey] : null;
  const Icon = meta ? meta.icon : Target;
  const color = meta ? meta.color : '#D4F684';
  const progressPercent = Math.min(100, Math.max(0, Math.round(highlightGoal.progressPercent || 0)));

  return (
    <Card
      variant="watch"
      className="p-4 bg-[#0D1C2D] border-[#1F2937] hover:border-[#5CA9E6]/50 cursor-pointer transition-all duration-200 flex flex-col gap-3 group relative overflow-hidden"
      onClick={() => navigate(`/goals/${highlightGoal.id}`)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-[#D4F684]" />
          <span className="font-mono text-[10px] text-[#C5C8B4] uppercase tracking-widest font-bold">
            Meta em Destaque
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate('/goals');
          }}
          className="flex items-center gap-1 font-mono text-[10px] text-[#8F9380] group-hover:text-[#5CA9E6] transition-colors"
        >
          <span>Ver todas</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-[4px] bg-[#161C24] flex items-center justify-center border flex-shrink-0"
            style={{ borderColor: `${color}40` }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-display text-sm font-bold text-[#D4E4FA] truncate group-hover:text-white transition-colors">
              {highlightGoal.title}
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#8F9380]">
              <span>
                {highlightGoal.currentValue} / {highlightGoal.targetValue} {highlightGoal.unit}
              </span>
              {highlightGoal.daysRemaining !== undefined && highlightGoal.daysRemaining > 0 && (
                <>
                  <span>•</span>
                  <span className="text-[#38BDF8] flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> {highlightGoal.daysRemaining}d
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="font-mono text-sm font-bold text-[#D4E4FA] flex-shrink-0">
          {progressPercent}%
        </div>
      </div>

      <GoalProgressBar progressPercent={progressPercent} color={color} />
    </Card>
  );
};
