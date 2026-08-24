import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import type { GoalDTO, SportKey } from '@pacelog/shared';
import { Target, Activity, Flame, Sun, Zap, Dumbbell, ArrowLeft, CheckCircle, PauseCircle, Trash2, Calendar, Waves } from 'lucide-react';
import confetti from 'canvas-confetti';

const sportMeta: Record<SportKey, { name: string; color: string; icon: any }> = {
  running: { name: 'Corrida', color: '#5CA9E6', icon: Activity },
  football: { name: 'Futebol', color: '#D4F684', icon: Flame },
  futevolei: { name: 'Futevôlei', color: '#FFB800', icon: Sun },
  boxing: { name: 'Boxe', color: '#FF6B35', icon: Zap },
  strength: { name: 'Musculação', color: '#A855F7', icon: Dumbbell },
  swimming: { name: 'Natação', color: '#38BDF8', icon: Waves },
};

export const GoalDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  
  const [goal, setGoal] = useState<GoalDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function loadGoal() {
      try {
        const data = await apiClient<GoalDTO>(`/api/goals/${id}`);
        setGoal(data);
      } catch (err) {
        toastError('Meta não encontrada.');
        navigate('/goals');
      } finally {
        setIsLoading(false);
      }
    }
    if (id) loadGoal();
  }, [id, navigate, toastError]);

  const handleUpdateStatus = async (status: 'achieved' | 'paused' | 'active') => {
    if (!goal || !id) return;
    setIsUpdating(true);
    try {
      const updated = await apiClient<GoalDTO>(`/api/goals/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      setGoal(updated);
      
      if (status === 'achieved') {
        success('Meta conquistada com sucesso! 🎉');
        fireConfetti();
      } else if (status === 'paused') {
        success('Meta pausada.');
      } else {
        success('Meta reativada.');
      }
    } catch (err) {
      toastError('Erro ao atualizar status da meta.');
    } finally {
      setIsUpdating(false);
    }
  };

  const fireConfetti = () => {
    const end = Date.now() + 3 * 1000;
    const colors = ['#D4F684', '#5CA9E6', '#FF6B35', '#A855F7'];

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <div className="font-mono text-xs text-[#8F9380] animate-pulse">Carregando meta...</div>
      </div>
    );
  }

  if (!goal) return null;

  const meta = goal.sportKey ? sportMeta[goal.sportKey] : null;
  const Icon = meta ? meta.icon : Target;
  const color = meta ? meta.color : '#D4F684';
  
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - ((goal.progressPercent || 0) / 100) * circumference;

  return (
    <div className="flex flex-col gap-6 font-sans max-w-2xl mx-auto w-full pb-20">
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <Link to="/goals" className="flex items-center gap-2 font-mono text-xs text-[#8F9380] hover:text-[#D4E4FA] transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Metas
        </Link>
        <Badge variant={goal.status === 'achieved' ? 'sage' : goal.status === 'paused' ? 'neutral' : 'cyan'}>
          {goal.status === 'achieved' ? 'CONCLUÍDO' : goal.status === 'paused' ? 'PAUSADO' : 'ATIVO'}
        </Badge>
      </div>

      <div className="flex flex-col items-center justify-center my-8">
        {/* Giant 360-degree SVG Circle Progress */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
            {/* Background track */}
            <circle cx="100" cy="100" r="90" stroke="#161C24" strokeWidth="12" fill="none" />
            {/* Progress track */}
            <circle 
              cx="100" 
              cy="100" 
              r="90" 
              stroke={color} 
              strokeWidth="12" 
              fill="none" 
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <Icon className="h-8 w-8 mb-2 opacity-50" style={{ color }} />
            <span className="font-display text-5xl font-bold text-[#D4E4FA]">
              {Math.round(goal.progressPercent || 0)}<span className="text-3xl text-[#8F9380]">%</span>
            </span>
            <span className="font-mono text-[10px] text-[#C5C8B4] uppercase mt-2">
              Progresso
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center mb-6 text-center">
        <h1 className="font-display text-3xl font-bold text-[#D4E4FA] mb-2">{goal.title}</h1>
        <p className="font-mono text-xs text-[#8F9380] max-w-md">
          {goal.notes || 'Nenhuma descrição fornecida.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col items-center gap-2 text-center">
          <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest">Valor Atual</span>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-3xl font-bold text-[#D4E4FA]">{goal.currentValue}</span>
            <span className="font-mono text-xs text-[#5CA9E6]">{goal.unit}</span>
          </div>
        </Card>
        
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col items-center gap-2 text-center">
          <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest">Alvo Final</span>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-3xl font-bold text-[#D4E4FA]">{goal.targetValue}</span>
            <span className="font-mono text-xs text-[#D4F684]">{goal.unit}</span>
          </div>
        </Card>
      </div>

      {goal.deadline && (
        <Card className="p-5 border-[#1F2937] flex justify-between items-center bg-[#161C24]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0D1C2D] rounded-full border border-[#1F2937]">
              <Calendar className="h-4 w-4 text-[#8F9380]" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[10px] text-[#8F9380] uppercase">Prazo Final</span>
              <span className="font-sans text-sm text-[#D4E4FA] font-medium">
                {new Date(goal.deadline as string).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </Card>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {goal.status !== 'achieved' ? (
          <Button 
            variant="tactile" 
            size="lg" 
            className="w-full h-14 text-lg"
            leftIcon={<CheckCircle className="h-5 w-5" />}
            onClick={() => handleUpdateStatus('achieved')}
            isLoading={isUpdating}
          >
            Marcar como Concluída
          </Button>
        ) : (
          <Button 
            variant="secondary" 
            size="lg" 
            className="w-full h-14 text-lg border-[#1F2937]"
            onClick={() => handleUpdateStatus('active')}
            isLoading={isUpdating}
          >
            Reabrir Meta
          </Button>
        )}

        <div className="flex gap-3">
          {goal.status === 'active' && (
            <Button 
              variant="secondary" 
              className="flex-1 border-[#1F2937]"
              leftIcon={<PauseCircle className="h-4 w-4" />}
              onClick={() => handleUpdateStatus('paused')}
              isLoading={isUpdating}
            >
              Pausar Meta
            </Button>
          )}
          {goal.status === 'paused' && (
            <Button 
              variant="secondary" 
              className="flex-1 border-[#1F2937]"
              leftIcon={<Activity className="h-4 w-4" />}
              onClick={() => handleUpdateStatus('active')}
              isLoading={isUpdating}
            >
              Retomar Meta
            </Button>
          )}
          
          <Button 
            variant="secondary" 
            className="text-[#FFB4AB] border-[#FFB4AB]/20 hover:bg-[#FFB4AB]/10"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={() => {
              if (window.confirm('Tem certeza que deseja excluir esta meta permanentemente?')) {
                apiClient(`/api/goals/${goal.id}`, { method: 'DELETE' }).then(() => {
                  success('Meta excluída.');
                  navigate('/goals');
                });
              }
            }}
          >
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );
};
