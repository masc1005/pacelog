import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { GoalProgressBar } from './GoalProgressBar';
import type { GoalDTO, SportKey } from '@pacelog/shared';
import {
  Target,
  Activity,
  Flame,
  Sun,
  Zap,
  Dumbbell,
  Waves,
  Bike,
  Shield,
  Clock,
  CheckCircle2,
  PauseCircle,
  AlertCircle,
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

interface GoalCardProps {
  goal: GoalDTO;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
  const navigate = useNavigate();
  const meta = goal.sportKey ? sportMeta[goal.sportKey] : null;
  const Icon = meta ? meta.icon : Target;
  const color = meta ? meta.color : '#D4F684';

  const progressPercent = Math.min(100, Math.max(0, Math.round(goal.progressPercent || 0)));
  const isCompleted = goal.status === 'completed' || goal.status === 'achieved' || progressPercent >= 100;
  const isPaused = goal.status === 'paused';
  const isExpired = goal.status === 'expired';

  // Formatação de Pace (se for average_pace_seconds_per_km)
  const formatValue = (val: number) => {
    if (goal.metricType === 'average_pace_seconds_per_km') {
      const min = Math.floor(val / 60);
      const sec = Math.round(val % 60);
      return `${min}:${sec.toString().padStart(2, '0')}`;
    }
    return val;
  };

  // SVG mini-circle progress calculations
  const circumference = 2 * Math.PI * 24;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <Card
      variant="watch"
      className="p-5 flex flex-col gap-4 bg-[#0D1C2D] border-[#1F2937] hover:border-[#5CA9E6]/50 cursor-pointer transition-all duration-200 group relative overflow-hidden"
      onClick={() => navigate(`/goals/${goal.id}`)}
    >
      {/* Glow corner indicator */}
      <div
        className="absolute top-0 right-0 w-24 h-24 blur-2xl opacity-10 pointer-events-none rounded-full"
        style={{ backgroundColor: color }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-[4px] bg-[#161C24] flex items-center justify-center border transition-colors group-hover:border-[#5CA9E6]/40"
            style={{ borderColor: `${color}40` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-sm text-[#D4E4FA] line-clamp-1 group-hover:text-white transition-colors">
              {goal.title}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider">
                {meta ? meta.name : 'Geral (Todos)'}
              </span>
              {goal.period && (
                <>
                  <span className="text-[#454839] text-xs">•</span>
                  <span className="font-mono text-[10px] text-[#8F9380] uppercase">
                    {goal.period === 'weekly' ? 'Semanal' : goal.period === 'monthly' ? 'Mensal' : 'Custom'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Badge de Status */}
        {isCompleted ? (
          <Badge variant="sage" size="sm" className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> CONCLUÍDA
          </Badge>
        ) : isPaused ? (
          <Badge variant="neutral" size="sm" className="flex items-center gap-1">
            <PauseCircle className="w-3 h-3" /> PAUSADA
          </Badge>
        ) : isExpired ? (
          <Badge variant="crimson" size="sm" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> EXPIRADA
          </Badge>
        ) : (
          <Badge variant="cyan" size="sm">
            EM ANDAMENTO
          </Badge>
        )}
      </div>

      {/* Medição Central */}
      <div className="flex items-center justify-between gap-4 pt-1">
        {/* SVG Mini Progress Dial */}
        <div className="relative w-14 h-14 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="24" stroke="#161C24" strokeWidth="4" fill="none" />
            <circle
              cx="30"
              cy="30"
              r="24"
              stroke={color}
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
            />
          </svg>
          <span className="absolute font-mono text-[11px] font-bold text-[#D4E4FA]">
            {progressPercent}%
          </span>
        </div>

        {/* Valores */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider">
              Progresso
            </span>
            {goal.daysRemaining !== undefined && goal.daysRemaining > 0 && !isCompleted && (
              <span className="font-mono text-[10px] text-[#38BDF8] flex items-center gap-1">
                <Clock className="w-3 h-3" /> {goal.daysRemaining}d restantes
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="font-display text-xl font-bold text-[#D4E4FA]">
              {formatValue(goal.currentValue)}
            </span>
            <span className="font-mono text-xs text-[#8F9380]">
              / {formatValue(goal.targetValue)} {goal.unit}
            </span>
          </div>
        </div>
      </div>

      {/* Barra Linear de Precisão */}
      <GoalProgressBar progressPercent={progressPercent} color={color} />
    </Card>
  );
};
