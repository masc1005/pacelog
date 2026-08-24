import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../lib/api';
import type { GoalDTO, SportKey } from '@pacelog/shared';
import { useNavigate } from 'react-router-dom';
import { Target, Activity, Flame, Sun, Zap, Dumbbell, Plus, Waves } from 'lucide-react';

const sportMeta: Record<SportKey, { name: string; color: string; icon: any; badge: 'cyan'|'amber'|'crimson'|'purple'|'green'|'blue' }> = {
  running: { name: 'Corrida', color: '#5CA9E6', icon: Activity, badge: 'cyan' },
  football: { name: 'Futebol', color: '#D4F684', icon: Flame, badge: 'green' },
  futevolei: { name: 'Futevôlei', color: '#FFB800', icon: Sun, badge: 'amber' },
  boxing: { name: 'Boxe', color: '#FF6B35', icon: Zap, badge: 'crimson' },
  strength: { name: 'Musculação', color: '#A855F7', icon: Dumbbell, badge: 'purple' },
  swimming: { name: 'Natação', color: '#38BDF8', icon: Waves, badge: 'blue' },
};

export const GoalsPage: React.FC = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<GoalDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadGoals() {
      try {
        const data = await apiClient<GoalDTO[]>('/api/goals');
        setGoals(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadGoals();
  }, []);

  return (
    <div className="flex flex-col gap-6 font-sans max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
            Metas & Marcos
          </h1>
          <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase">
            Acompanhamento de alvos táticos
          </p>
        </div>
        <Button variant="tactile" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
          NOVA META
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="font-mono text-xs text-[#8F9380] animate-pulse">Carregando metas...</div>
        </div>
      ) : goals.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center gap-3 border-dashed border-[#454839]">
          <Target className="h-8 w-8 text-[#8F9380]" />
          <span className="font-mono text-sm text-[#C5C8B4] uppercase">Nenhuma meta ativa</span>
          <Button variant="secondary" size="sm" className="mt-2 text-xs">Criar Primeira Meta</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => {
            const meta = goal.sportKey ? sportMeta[goal.sportKey] : null;
            const Icon = meta ? meta.icon : Target;
            const color = meta ? meta.color : '#D4F684';
            
            const circumference = 2 * Math.PI * 35;
            const strokeDashoffset = circumference - ((goal.progressPercent || 0) / 100) * circumference;

            return (
              <Card 
                key={goal.id} 
                variant="watch" 
                className="p-5 flex flex-col gap-4 bg-[#0D1C2D] border-[#1F2937] cursor-pointer hover:border-[#5CA9E6] transition-colors"
                onClick={() => navigate(`/goals/${goal.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-[2px] bg-[#161C24] flex items-center justify-center border border-[#1F2937]">
                      <Icon className="h-4 w-4" style={{ color }} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-display font-bold text-[#D4E4FA]">{goal.title}</span>
                      <span className="font-mono text-[9px] text-[#8F9380] uppercase">
                        {goal.period === 'weekly' ? 'SEMANAL' : goal.period === 'monthly' ? 'MENSAL' : 'CUSTOMIZADO'}
                      </span>
                    </div>
                  </div>
                  <Badge variant={goal.status === 'achieved' ? 'sage' : 'neutral'} size="sm">
                    {goal.status === 'achieved' ? 'CONCLUÍDO' : 'EM ANDAMENTO'}
                  </Badge>
                </div>

                <div className="flex items-center gap-4">
                  {/* SVG Circle Progress */}
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="35" stroke="#1D2630" strokeWidth="4" fill="none" />
                      <circle 
                        cx="40" 
                        cy="40" 
                        r="35" 
                        stroke={color} 
                        strokeWidth="4" 
                        fill="none" 
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                      />
                    </svg>
                    <span className="absolute font-mono text-xs font-bold text-[#D4E4FA]">{Math.round(goal.progressPercent || 0)}%</span>
                  </div>

                  <div className="flex flex-col gap-1 flex-1">
                    <span className="font-mono text-[10px] text-[#8F9380] uppercase">Progresso Atual</span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-2xl font-bold text-[#D4E4FA]">{goal.currentValue}</span>
                      <span className="font-mono text-xs text-[#8F9380]">/ {goal.targetValue} {goal.unit}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
