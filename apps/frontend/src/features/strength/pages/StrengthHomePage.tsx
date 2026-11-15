import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useActiveStrengthSession } from '../hooks/useActiveStrengthSession';
import { strengthApi } from '../../../services/strength.api';
import { formatDuration } from '../hooks/useSessionTimer';
import { randomUUID, toLocalInputDateTime } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../contexts/ToastContext';
import { AIWorkoutBuilderCard } from '../components/AIWorkoutBuilderCard';
import { StrengthInsightCard } from '../components/StrengthInsightCard';
import { MuscleFatigueTelemetry } from '../../../components/progress/MuscleFatigueTelemetry';
import { PhysiqueAssessmentModal } from '../../physique/components/PhysiqueAssessmentModal';
import {
  Dumbbell,
  ArrowLeft,
  Play,
  Bookmark,
  Trash2,
  Layers,
  History,
  ChevronRight,
  Clock,
  ScanLine,
} from 'lucide-react';
import type {
  StrengthRoutineDTO,
  GeneratedStrengthWorkoutDTO,
  CompletedStrengthSession,
} from '@pacelog/shared';

/**
 * Ponto de entrada do módulo de musculação.
 */
export const StrengthHomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error: toastError } = useToast();
  const { session, isLoading } = useActiveStrengthSession();
  const [customStartedAt, setCustomStartedAt] = useState<string>(() =>
    toLocalInputDateTime(new Date())
  );
  const [isStarting, setIsStarting] = useState(false);
  const [startingRoutineId, setStartingRoutineId] = useState<string | null>(null);
  const [routines, setRoutines] = useState<StrengthRoutineDTO[]>([]);
  const [isLoadingRoutines, setIsLoadingRoutines] = useState(true);
  const [recentSessions, setRecentSessions] = useState<CompletedStrengthSession[]>([]);
  const [deletingRoutineId, setDeletingRoutineId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPhysiqueModal, setShowPhysiqueModal] = useState(false);
  const startedRef = useRef(false);

  const state = location.state as { startedAt?: string; autoStart?: boolean; routineId?: string } | null;
  const passedStartedAt = state?.startedAt;
  const autoStart = state?.autoStart;
  const passedRoutineId = state?.routineId;

  useEffect(() => {
    strengthApi
      .listRoutines()
      .then((data) => setRoutines(data || []))
      .catch(() => setRoutines([]))
      .finally(() => setIsLoadingRoutines(false));

    strengthApi
      .listSessions(1, 3)
      .then((data) => {
        const items = Array.isArray(data) ? data : ((data as any)?.items || []);
        setRecentSessions(items.slice(0, 3));
      })
      .catch(() => setRecentSessions([]));
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (session) {
      navigate('/strength/active', { replace: true });
      return;
    }

    if (autoStart && passedStartedAt && !startedRef.current) {
      startedRef.current = true;
      setIsStarting(true);
      strengthApi
        .startSession({
          operationId: randomUUID(),
          startedAt: passedStartedAt,
          routineId: passedRoutineId,
        })
        .then(() => navigate('/strength/active', { replace: true }))
        .catch((err) => {
          console.error('Erro ao auto-iniciar sessão de musculação:', err);
          navigate('/strength/active', { replace: true });
        });
    }
  }, [isLoading, session, autoStart, passedStartedAt, passedRoutineId, navigate]);

  const handleStart = async (routineId?: string) => {
    if (isStarting || startingRoutineId) return;
    if (routineId) {
      setStartingRoutineId(routineId);
    } else {
      setIsStarting(true);
    }
    setError(null);
    try {
      const isoDate = new Date(customStartedAt).toISOString();
      await strengthApi.startSession({
        operationId: randomUUID(),
        startedAt: isoDate,
        routineId,
      });
      navigate('/strength/active', { replace: true });
    } catch (err: any) {
      console.error('Erro ao iniciar treino:', err);
      setError(err?.message || 'Erro ao iniciar treino.');
      setIsStarting(false);
      setStartingRoutineId(null);
    }
  };

  const handleStartGeneratedWorkout = async (workout: GeneratedStrengthWorkoutDTO) => {
    if (isStarting || startingRoutineId) return;
    setIsStarting(true);
    setError(null);
    try {
      const isoDate = new Date(customStartedAt).toISOString();
      await strengthApi.startSession({
        operationId: randomUUID(),
        startedAt: isoDate,
        notes: `IA Personal: ${workout.name}`,
        exercises: workout.exercises,
      });
      navigate('/strength/active', { replace: true });
    } catch (err: any) {
      console.error('Erro ao iniciar treino gerado pela IA:', err);
      setError(err?.message || 'Erro ao iniciar treino gerado pela IA.');
      setIsStarting(false);
    }
  };

  const handleDeleteRoutine = async (routineId: string, name: string) => {
    setDeletingRoutineId(routineId);
    try {
      await strengthApi.deleteRoutine(routineId);
      setRoutines((prev) => prev.filter((r) => r.id !== routineId));
      success(`Ficha "${name}" removida.`);
    } catch (err: any) {
      toastError(err?.message || 'Erro ao excluir ficha.');
    } finally {
      setDeletingRoutineId(null);
    }
  };

  if (isLoading || (autoStart && passedStartedAt)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]" aria-busy="true">
        <p className="font-mono text-sm text-[#8F9380] animate-pulse uppercase tracking-widest">
          {autoStart ? 'Iniciando Treino…' : 'Carregando…'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-lg mx-auto w-full gap-4 pb-24 font-sans">
      {/* Header compacto */}
      <header className="flex items-center justify-between border-b border-[#1F2937] pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-1.5 font-mono text-xs text-[#8F9380] hover:text-[#D4E4FA] transition-colors"
            onClick={() => navigate('/sessions')}
            aria-label="Voltar para Sessões"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Sessões</span>
          </button>
        </div>
        <Link
          to="/strength/history"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#5CA9E6] hover:underline"
        >
          <History className="h-3.5 w-3.5" />
          <span>Histórico</span>
        </Link>
      </header>

      {/* 1. Ação rápida de iniciar treino no topo */}
      <Card className="p-4 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-[4px] bg-[#A855F7]/10 border border-[#A855F7]/30 flex items-center justify-center text-[#A855F7] shrink-0">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="font-display text-lg font-bold text-[#D4E4FA] uppercase tracking-wide leading-tight">
                Musculação
              </h1>
              <span className="font-mono text-[10px] text-[#8F9380] uppercase">
                Início rápido
              </span>
            </div>
          </div>

          <Button
            variant="tactile"
            size="md"
            isLoading={isStarting}
            disabled={!!startingRoutineId}
            onClick={() => handleStart()}
            leftIcon={<Play className="h-4 w-4" />}
            className="shrink-0"
          >
            Treino Livre
          </Button>
        </div>

        {error && (
          <div className="p-2.5 bg-[#FF6B35]/10 border border-[#FF6B35]/50 rounded-[4px] font-mono text-xs text-[#FF6B35]">
            {error}
          </div>
        )}

        {/* Horário de início compacto em 1 linha */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#1F2937]">
          <Clock className="h-3.5 w-3.5 text-[#8F9380] shrink-0" />
          <label
            htmlFor="strength-start-time"
            className="font-mono text-[10px] text-[#8F9380] uppercase shrink-0"
          >
            Início
          </label>
          <input
            id="strength-start-time"
            type="datetime-local"
            value={customStartedAt}
            onChange={(e) => setCustomStartedAt(e.target.value)}
            className="flex-1 min-w-0 bg-[#161C24] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-xs rounded-[4px] px-2.5 py-1.5 outline-none transition-colors"
          />
          <button
            type="button"
            onClick={() => setCustomStartedAt(toLocalInputDateTime(new Date()))}
            className="font-mono text-[10px] uppercase text-[#D4F684] hover:underline shrink-0"
          >
            Agora
          </button>
        </div>
      </Card>

      {/* 2. Seção de rotinas salvas */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-[#A855F7]" />
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-[#D4E4FA] font-bold">
              Minhas Fichas
            </h2>
          </div>
          <Badge variant="purple" size="sm">
            {routines.length} {routines.length === 1 ? 'ficha' : 'fichas'}
          </Badge>
        </div>

        {isLoadingRoutines ? (
          <Card className="p-4 bg-[#0D1C2D] border-[#1F2937] flex justify-center">
            <span className="font-mono text-xs text-[#8F9380] animate-pulse">
              Carregando fichas…
            </span>
          </Card>
        ) : routines.length === 0 ? (
          <Card className="p-4 bg-[#0D1C2D]/60 border-dashed border-[#1F2937] flex items-center gap-3">
            <Layers className="h-5 w-5 text-[#8F9380] shrink-0" />
            <p className="font-mono text-[11px] text-[#8F9380]">
              Nenhuma ficha salva. Gere com IA ou salve um treino concluído como ficha.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            {routines.map((routine) => {
              const totalSets = routine.exercises.reduce(
                (acc, ex) => acc + (ex.sets?.length || 0),
                0
              );
              const isStartingThis = startingRoutineId === routine.id;
              const isDeletingThis = deletingRoutineId === routine.id;

              return (
                <Card
                  key={routine.id}
                  className="p-3.5 bg-[#0D1C2D] border-[#1F2937] hover:border-[#A855F7]/40 transition-colors flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <h3 className="font-display text-sm font-bold text-[#D4E4FA] tracking-wide truncate">
                        {routine.name}
                      </h3>
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#A855F7] uppercase mt-0.5">
                        <span>{routine.exercises.length} exerc.</span>
                        <span>•</span>
                        <span>{totalSets} séries</span>
                        {routine.lastUsedAt && (
                          <>
                            <span>•</span>
                            <span className="text-[#8F9380]">
                              {new Date(routine.lastUsedAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={isStartingThis}
                        disabled={isStarting || (!!startingRoutineId && !isStartingThis)}
                        onClick={() => handleStart(routine.id)}
                        leftIcon={<Play className="h-3 w-3 text-[#D4F684]" />}
                        className="border-[#A855F7]/30 hover:border-[#D4F684] text-[#D4E4FA] bg-[#161C24]"
                      >
                        Iniciar
                      </Button>
                      <button
                        type="button"
                        disabled={isDeletingThis || isStartingThis}
                        onClick={() => handleDeleteRoutine(routine.id, routine.name)}
                        className="p-1.5 text-[#8F9380] hover:text-[#FFB4AB] hover:bg-[#FFB4AB]/10 rounded transition-colors disabled:opacity-50"
                        title="Excluir ficha"
                        aria-label={`Excluir ficha ${routine.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Preview compacto dos exercícios */}
                  <div className="flex flex-wrap gap-1">
                    {routine.exercises.slice(0, 4).map((ex, i) => (
                      <span
                        key={i}
                        className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#161C24] border border-[#1F2937] text-[#C5C8B4]"
                      >
                        {ex.exerciseNameSnapshot} ({ex.sets?.length || 1}x)
                      </span>
                    ))}
                    {routine.exercises.length > 4 && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#161C24] text-[#8F9380]">
                        +{routine.exercises.length - 4}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Banner compacto da IA Personal (abre Modal/Sheet ao clicar) */}
      <AIWorkoutBuilderCard
        onStartGeneratedWorkout={handleStartGeneratedWorkout}
        onRoutineSaved={(newRoutine) => setRoutines((prev) => [newRoutine, ...prev])}
        disabled={isStarting || !!startingRoutineId}
      />

      {/* 3b. Atalho Avaliação Física por IA (Calibração Dimensional & Pontos Fracos) */}
      <button
        type="button"
        onClick={() => setShowPhysiqueModal(true)}
        className="w-full p-3.5 rounded-[4px] bg-[#0D1C2D] border border-[#5CA9E6]/30 hover:border-[#5CA9E6] flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-[4px] bg-[#5CA9E6]/10 border border-[#5CA9E6]/30 flex items-center justify-center text-[#5CA9E6] shrink-0">
            <ScanLine className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-display text-xs font-bold text-[#D4E4FA] uppercase tracking-wide">
              Avaliação Física por IA
            </span>
            <span className="font-mono text-[10px] text-[#8F9380] truncate">
              Calibração espacial efêmera & fichas para pontos fracos
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#5CA9E6] shrink-0" />
      </button>

      {/* 4. Mapa de fadiga muscular compacto */}
      <MuscleFatigueTelemetry compact />

      {/* 5. Insight compacto da última sessão concluída */}
      {recentSessions[0]?.id && (
        <StrengthInsightCard sessionId={recentSessions[0].id} compact />
      )}

      {/* 6. Prévia limitada de histórico recente direcionando para StrengthSessionHistoryPage */}
      {recentSessions.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-[#8F9380] font-bold">
              Histórico Recente
            </h2>
            <Link
              to="/strength/history"
              className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[#5CA9E6] hover:underline"
            >
              <span>Ver tudo</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex flex-col gap-1.5">
            {recentSessions.slice(0, 3).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/strength/sessions/${item.id}`)}
                className="w-full px-3 py-2.5 rounded-[4px] bg-[#0D1C2D] border border-[#1F2937] hover:border-[#5CA9E6]/50 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-display text-xs font-bold text-[#D4E4FA] uppercase truncate">
                    {new Date(item.startedAt).toLocaleDateString('pt-BR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                    })}{' '}
                    •{' '}
                    {new Date(item.startedAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="font-mono text-[10px] text-[#8F9380] mt-0.5">
                    {item.exercises.length} exerc. • {item.completedSets} séries
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right leading-tight">
                    <span className="font-mono text-xs font-bold text-[#D4E4FA] block">
                      {item.totalVolumeKg != null
                        ? `${Math.round(item.totalVolumeKg).toLocaleString('pt-BR')} kg`
                        : '—'}
                    </span>
                    <span className="font-mono text-[10px] text-[#8F9380]">
                      {formatDuration(item.durationSeconds)}
                    </span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-[#8F9380]" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
      <PhysiqueAssessmentModal
        isOpen={showPhysiqueModal}
        onClose={() => setShowPhysiqueModal(false)}
        onPlanGenerated={(newRoutines) => {
          setRoutines((prev) => [...newRoutines, ...prev]);
        }}
      />
    </div>
  );
};
