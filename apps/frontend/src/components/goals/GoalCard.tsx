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

  const formatValue = (val: number) => {
    if (goal.metricType === 'average_pace_seconds_per_km') {
      const min = Math.floor(val / 60);
      const sec = Math.round(val % 60);
      return `${min}:${sec.toString().padStart(2, '0')}`;
    }
    return val;
  };

  return (
    <Card
      variant="simple"
      className="p-3.5 flex flex-col gap-2 bg-[#0D1C2D] border-[#1F2937] hover:border-[#5CA9E6]/50 cursor-pointer transition-all duration-200 rounded-[4px]"
      onClick={() => navigate(`/goals/${goal.id}`)}
    >
      {/* Linha superior discreta: modalidade / período + status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
          <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider truncate">
            {meta ? meta.name : 'Geral'}
            {goal.period
              ? ` • ${goal.period === 'weekly' ? 'Semanal' : goal.period === 'monthly' ? 'Mensal' : 'Custom'}`
              : ''}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {goal.daysRemaining !== undefined && goal.daysRemaining > 0 && !isCompleted && (
            <span className="font-mono text-[10px] text-[#38BDF8] flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {goal.daysRemaining}d
            </span>
          )}
          {isCompleted ? (
            <Badge variant="sage" size="sm" className="px-1.5 py-0 text-[9px]">
              <CheckCircle2 className="w-2.5 h-2.5" /> Concluída
            </Badge>
          ) : isPaused ? (
            <Badge variant="neutral" size="sm" className="px-1.5 py-0 text-[9px]">
              <PauseCircle className="w-2.5 h-2.5" /> Pausada
            </Badge>
          ) : isExpired ? (
            <Badge variant="crimson" size="sm" className="px-1.5 py-0 text-[9px]">
              <AlertCircle className="w-2.5 h-2.5" /> Expirada
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Título, meta-alvo e percentual alinhados na mesma linha */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display font-bold text-sm text-[#D4E4FA] truncate flex-1 min-w-0">
          {goal.title}
        </span>

        <div className="flex items-baseline gap-2 shrink-0">
          <span className="font-mono text-xs text-[#C5C8B4]">
            {formatValue(goal.currentValue)}/{formatValue(goal.targetValue)} {goal.unit}
          </span>
          <span className="font-mono text-xs font-bold" style={{ color }}>
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Barra Linear de Precisão */}
      <GoalProgressBar progressPercent={progressPercent} color={color} />
    </Card>
  );
};
