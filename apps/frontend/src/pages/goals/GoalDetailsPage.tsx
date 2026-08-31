import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { GoalCelebrateModal } from '../../components/goals/GoalCelebrateModal';
import { EditGoalModal } from '../../components/goals/EditGoalModal';
import { DeleteGoalModal } from '../../components/goals/DeleteGoalModal';
import type { GoalDTO, SportKey } from '@pacelog/shared';
import {
  Target,
  Activity,
  Flame,
  Sun,
  Zap,
  Dumbbell,
  ArrowLeft,
  CheckCircle2,
  PauseCircle,
  Play,
  Trash2,
  Calendar,
  Waves,
  Bike,
  Shield,
  TrendingUp,
  Edit3,
  ListOrdered,
  ChevronRight,
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

export const GoalDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [goal, setGoal] = useState<GoalDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Modais
  const [showCelebrateModal, setShowCelebrateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const loadGoal = useCallback(async () => {
    try {
      const data = await apiClient<GoalDTO>(`/api/goals/${id}`);
      setGoal(data);

      // Dispara celebração se recém concluída e ainda não exibida
      if (
        (data.status === 'completed' || data.status === 'achieved' || (data.progressPercent || 0) >= 100) &&
        !data.celebrationShown
      ) {
        setShowCelebrateModal(true);
        // Marca celebrationShown no backend para não repetir
        apiClient(`/api/goals/${data.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ celebrationShown: true }),
        }).catch(() => {});
      }
    } catch {
      addToast('Meta não encontrada.', 'error');
      navigate('/goals');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate, addToast]);

  useEffect(() => {
    if (id) loadGoal();
  }, [id, loadGoal]);

  const handleStatusAction = async (action: 'pause' | 'resume' | 'complete') => {
    if (!goal || !id) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await apiClient<GoalDTO>(`/api/goals/${id}/${action}`, {
        method: 'POST',
      });
      setGoal(updated);

      if (action === 'complete') {
        setShowCelebrateModal(true);
        addToast('Meta conquistada com sucesso!', 'success');
      } else if (action === 'pause') {
        addToast('Meta pausada.', 'info');
      } else {
        addToast('Meta retomada com sucesso.', 'success');
      }
    } catch {
      addToast('Erro ao atualizar status da meta.', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3">
        <div className="w-8 h-8 border-2 border-[#D4F684] border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-xs text-[#8F9380] uppercase tracking-wider">
          Carregando telemetria da meta...
        </span>
      </div>
    );
  }

  if (!goal) return null;

  const meta = goal.sportKey ? sportMeta[goal.sportKey] : null;
  const Icon = meta ? meta.icon : Target;
  const color = meta ? meta.color : '#D4F684';

  const progressPercent = Math.min(100, Math.max(0, Math.round(goal.progressPercent || 0)));
  const isCompleted = goal.status === 'completed' || goal.status === 'achieved' || progressPercent >= 100;
  const isPaused = goal.status === 'paused';
  const isExpired = goal.status === 'expired';

  // Formatação de valores (especialmente pace)
  const formatValue = (val: number) => {
    if (goal.metricType === 'average_pace_seconds_per_km') {
      const min = Math.floor(val / 60);
      const sec = Math.round(val % 60);
      return `${min}:${sec.toString().padStart(2, '0')}`;
    }
    return val;
  };

  // Cálculo de restante
  const remainingValue = Math.max(0, Math.round((goal.targetValue - goal.currentValue) * 10) / 10);

  // SVG 360° Circular Gauge
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="flex flex-col gap-6 font-sans max-w-3xl mx-auto w-full pb-20">
      {/* Header com Navegação e Status */}
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <Link
          to="/goals"
          className="flex items-center gap-2 font-mono text-xs text-[#8F9380] hover:text-[#D4E4FA] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Metas</span>
        </Link>

        {isCompleted ? (
          <Badge variant="sage" size="sm" className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> CONCLUÍDA
          </Badge>
        ) : isPaused ? (
          <Badge variant="neutral" size="sm" className="flex items-center gap-1">
            <PauseCircle className="w-3.5 h-3.5" /> PAUSADA
          </Badge>
        ) : isExpired ? (
          <Badge variant="crimson" size="sm">
            EXPIRADA
          </Badge>
        ) : (
          <Badge variant="cyan" size="sm">
            EM ANDAMENTO
          </Badge>
        )}
      </div>

      {/* 360° Precision Circular Gauge */}
      <div className="flex flex-col items-center justify-center my-4 relative">
        <div
          className="absolute w-56 h-56 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ backgroundColor: color }}
        />

        <div className="relative w-56 h-56 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
            {/* Background Track */}
            <circle cx="100" cy="100" r={radius} stroke="#161C24" strokeWidth="10" fill="none" />
            {/* Progress Track */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              stroke={color}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </svg>

          <div className="absolute flex flex-col items-center justify-center text-center">
            <Icon className="w-7 h-7 mb-1 opacity-60" style={{ color }} />
            <span className="font-display text-4xl font-bold text-[#D4E4FA] tracking-tight">
              {progressPercent}
              <span className="text-2xl text-[#8F9380]">%</span>
            </span>
            <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest mt-1">
              Progresso
            </span>
          </div>
        </div>

        {/* Título & Descrição */}
        <div className="flex flex-col items-center text-center mt-4 max-w-md">
          <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
            {goal.title}
          </h1>
          <p className="font-mono text-xs text-[#8F9380] mt-1">
            {goal.notes || 'Meta tática vinculada ao seu plano de evolução.'}
          </p>
        </div>
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-[#0D1C2D] border-[#1F2937] flex flex-col items-center text-center gap-1">
          <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider">
            Atual
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-2xl font-bold text-[#D4E4FA]">
              {formatValue(goal.currentValue)}
            </span>
            <span className="font-mono text-xs text-[#5CA9E6]">{goal.unit}</span>
          </div>
        </Card>

        <Card className="p-4 bg-[#0D1C2D] border-[#1F2937] flex flex-col items-center text-center gap-1">
          <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider">
            Alvo
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-2xl font-bold text-[#D4E4FA]">
              {formatValue(goal.targetValue)}
            </span>
            <span className="font-mono text-xs text-[#D4F684]">{goal.unit}</span>
          </div>
        </Card>

        <Card className="p-4 bg-[#0D1C2D] border-[#1F2937] flex flex-col items-center text-center gap-1">
          <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider">
            Falta
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-2xl font-bold text-[#D4E4FA]">
              {isCompleted ? '0' : remainingValue}
            </span>
            <span className="font-mono text-xs text-[#8F9380]">{goal.unit}</span>
          </div>
        </Card>

        <Card className="p-4 bg-[#0D1C2D] border-[#1F2937] flex flex-col items-center text-center gap-1">
          <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider">
            Janela
          </span>
          <span className="font-display text-base font-bold text-[#D4E4FA] uppercase mt-1">
            {goal.period === 'weekly' ? 'Semanal' : goal.period === 'monthly' ? 'Mensal' : 'Custom'}
          </span>
        </Card>
      </div>

      {/* Card de Ritmo Necessário no Prazo */}
      {goal.deadline && (
        <Card className="p-4 bg-[#161C24] border-[#1F2937] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0D1C2D] rounded-[4px] border border-[#1F2937] text-[#38BDF8]">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[10px] text-[#8F9380] uppercase">
                Prazo Limite
              </span>
              <span className="font-display text-sm font-bold text-[#D4E4FA]">
                {new Date(goal.deadline).toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {goal.requiredPacePerWeek && !isCompleted && (
            <div className="flex items-center gap-2 bg-[#0D1C2D] px-3.5 py-2 rounded-[4px] border border-[#38BDF8]/30">
              <TrendingUp className="w-4 h-4 text-[#38BDF8]" />
              <div className="flex flex-col">
                <span className="font-mono text-[9px] text-[#8F9380] uppercase">
                  Ritmo Necessário
                </span>
                <span className="font-mono text-xs font-bold text-[#38BDF8]">
                  {goal.requiredPacePerWeek}
                </span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Histórico de Sessões Contribuintes */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-[#D4F684]" />
            <h3 className="font-display text-sm font-bold text-[#D4E4FA] uppercase tracking-wider">
              Sessões Contribuintes ({goal.contributingSessionsCount || 0})
            </h3>
          </div>
        </div>

        {(!goal.contributingSessions || goal.contributingSessions.length === 0) ? (
          <Card className="p-6 bg-[#0D1C2D]/50 border-dashed border-[#1F2937] text-center">
            <p className="font-mono text-xs text-[#8F9380]">
              Nenhum treino registrado nesta janela pontuou para esta meta ainda.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {goal.contributingSessions.map((session, idx) => {
              const sessionMeta = sportMeta[session.sportKey];
              const SessionIcon = sessionMeta ? sessionMeta.icon : Target;
              const sessionColor = sessionMeta ? sessionMeta.color : '#D4F684';

              return (
                <div
                  key={session.id || idx}
                  className="p-3 bg-[#0D1C2D] border border-[#1F2937] rounded-[4px] flex items-center justify-between hover:border-[#454839] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-[4px] bg-[#161C24] flex items-center justify-center border"
                      style={{ borderColor: `${sessionColor}40` }}
                    >
                      <SessionIcon className="w-4 h-4" style={{ color: sessionColor }} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-display text-xs font-bold text-[#D4E4FA]">
                        {sessionMeta ? sessionMeta.name : session.sportKey}
                      </span>
                      <span className="font-mono text-[10px] text-[#8F9380]">
                        {new Date(session.startedAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#D4F684]">
                      +{session.value} {session.unit}
                    </span>
                    {session.id && (
                      <Link
                        to={`/sessions/${session.id}`}
                        className="text-[#8F9380] hover:text-[#D4E4FA] p-1"
                        aria-label="Ver sessão"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Barra de Ações de Ciclo de Vida */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-[#1F2937]">
        {!isCompleted ? (
          <Button
            variant="tactile"
            size="lg"
            className="w-full sm:flex-1 font-mono text-xs uppercase tracking-wider py-3"
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
            onClick={() => handleStatusAction('complete')}
            isLoading={isUpdatingStatus}
          >
            Concluir Meta
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="lg"
            className="w-full sm:flex-1 font-mono text-xs uppercase tracking-wider py-3"
            leftIcon={<Play className="w-4 h-4" />}
            onClick={() => handleStatusAction('resume')}
            isLoading={isUpdatingStatus}
          >
            Reativar Meta
          </Button>
        )}

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {goal.status === 'active' && !isCompleted && (
            <Button
              variant="secondary"
              size="md"
              className="flex-1 sm:flex-none font-mono text-xs uppercase"
              leftIcon={<PauseCircle className="w-4 h-4" />}
              onClick={() => handleStatusAction('pause')}
              isLoading={isUpdatingStatus}
            >
              Pausar
            </Button>
          )}

          {goal.status === 'paused' && (
            <Button
              variant="secondary"
              size="md"
              className="flex-1 sm:flex-none font-mono text-xs uppercase"
              leftIcon={<Play className="w-4 h-4" />}
              onClick={() => handleStatusAction('resume')}
              isLoading={isUpdatingStatus}
            >
              Retomar
            </Button>
          )}

          <Button
            variant="secondary"
            size="md"
            className="flex-1 sm:flex-none font-mono text-xs uppercase"
            leftIcon={<Edit3 className="w-4 h-4" />}
            onClick={() => setShowEditModal(true)}
          >
            Editar
          </Button>

          <Button
            variant="secondary"
            size="md"
            className="text-red-400 border-red-500/20 hover:bg-red-500/10 font-mono text-xs uppercase"
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={() => setShowDeleteModal(true)}
          >
            Excluir
          </Button>
        </div>
      </div>

      {/* Modais */}
      {showCelebrateModal && (
        <GoalCelebrateModal goal={goal} onClose={() => setShowCelebrateModal(false)} />
      )}

      {showEditModal && (
        <EditGoalModal
          goal={goal}
          onClose={() => setShowEditModal(false)}
          onSuccess={(updated) => setGoal(updated)}
        />
      )}

      {showDeleteModal && (
        <DeleteGoalModal
          goal={goal}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={() => navigate('/goals')}
        />
      )}
    </div>
  );
};
