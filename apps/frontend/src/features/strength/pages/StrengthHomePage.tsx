import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useActiveStrengthSession } from '../hooks/useActiveStrengthSession';
import { strengthApi } from '../../../services/strength.api';
import { randomUUID, toLocalInputDateTime } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../contexts/ToastContext';
import { AIWorkoutBuilderCard } from '../components/AIWorkoutBuilderCard';
import { Dumbbell, ArrowLeft, Play, Bookmark, Trash2, Layers } from 'lucide-react';
import type { StrengthRoutineDTO, GeneratedStrengthWorkoutDTO } from '@pacelog/shared';

/**
 * Ponto de entrada do módulo de musculação.
 *
 * Comportamento:
 * - Sessão ativa encontrada → redireciona direto para /strength/active
 * - Parâmetro autoStart recebido via navegação → inicia imediatamente com data/hora escolhida
 * - Sem sessão ativa → permite definir data/hora de início, usar a IA Personal opcional ou iniciar a partir de uma Ficha/Rotina salva
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
  const [deletingRoutineId, setDeletingRoutineId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (session) {
      // Já há sessão ativa — retoma
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

  // Tela de carregamento enquanto verifica se há sessão ativa ou executa auto-start
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
    <div className="flex flex-col max-w-lg mx-auto w-full p-4 sm:p-0 gap-6 pb-24 font-sans">
      <header className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <button
          className="flex items-center gap-2 font-mono text-xs text-[#8F9380] hover:text-[#D4E4FA] transition-colors"
          onClick={() => navigate('/sessions')}
          aria-label="Voltar para Sessões"
        >
          <ArrowLeft className="h-4 w-4" />
          Sessões
        </button>
      </header>

      <Card className="p-6 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[4px] bg-[#A855F7]/10 border border-[#A855F7]/30 flex items-center justify-center text-[#A855F7]">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-display text-xl font-bold text-[#D4E4FA] uppercase tracking-wide">
              Novo Treino
            </h1>
            <p className="font-mono text-xs text-[#8F9380]">
              Musculação & Hipertrofia
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-[#FF6B35]/10 border border-[#FF6B35]/50 rounded-[4px] font-mono text-xs text-[#FF6B35]">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2 border-t border-[#1F2937]">
          <div className="flex items-center justify-between">
            <label
              htmlFor="strength-start-time"
              className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest"
            >
              Data e Hora de Início
            </label>
            <button
              type="button"
              onClick={() => setCustomStartedAt(toLocalInputDateTime(new Date()))}
              className="font-mono text-[10px] uppercase text-[#D4F684] hover:underline"
            >
              Usar Agora
            </button>
          </div>
          <input
            id="strength-start-time"
            type="datetime-local"
            value={customStartedAt}
            onChange={(e) => setCustomStartedAt(e.target.value)}
            className="w-full bg-[#161C24] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-sm rounded-[4px] px-3.5 py-2.5 outline-none transition-colors"
          />
          <p className="font-mono text-[11px] text-[#8F9380]">
            Defina o início para sincronização precisa da linha do tempo e telemetria.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="tactile"
            size="lg"
            isLoading={isStarting}
            disabled={!!startingRoutineId}
            onClick={() => handleStart()}
            leftIcon={<Play className="h-4 w-4" />}
            className="w-full justify-center"
          >
            Iniciar Treino Livre
          </Button>
          <button
            type="button"
            onClick={() => navigate('/sessions')}
            className="w-full py-2 text-center font-mono text-xs text-[#8F9380] hover:text-[#C5C8B4] transition-colors"
          >
            Cancelar
          </button>
        </div>
      </Card>

      {/* Assistente Opcional de IA Personal */}
      <AIWorkoutBuilderCard
        onStartGeneratedWorkout={handleStartGeneratedWorkout}
        onRoutineSaved={(newRoutine) => setRoutines((prev) => [newRoutine, ...prev])}
        disabled={isStarting || !!startingRoutineId}
      />

      {/* Seção de Fichas / Templates de Treino */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-[#A855F7]" />
            <h2 className="font-mono text-xs uppercase tracking-widest text-[#D4E4FA] font-bold">
              Minhas Fichas de Treino
            </h2>
          </div>
          <Badge variant="purple" size="sm">
            {routines.length} {routines.length === 1 ? 'ficha' : 'fichas'}
          </Badge>
        </div>

        {isLoadingRoutines ? (
          <Card className="p-6 bg-[#0D1C2D] border-[#1F2937] flex justify-center">
            <span className="font-mono text-xs text-[#8F9380] animate-pulse">
              Carregando fichas…
            </span>
          </Card>
        ) : routines.length === 0 ? (
          <Card className="p-5 bg-[#0D1C2D]/60 border-dashed border-[#1F2937] flex flex-col items-center text-center gap-2">
            <Layers className="h-6 w-6 text-[#8F9380]" />
            <p className="font-mono text-xs text-[#C5C8B4]">
              Nenhuma ficha salva ainda.
            </p>
            <p className="font-mono text-[11px] text-[#8F9380] max-w-xs">
              Você pode usar o <strong className="text-[#D4F684]">"Montar com IA Personal"</strong> acima ou salvar qualquer treino concluído como ficha para iniciar com 1 clique!
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
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
                  className="p-4 bg-[#0D1C2D] border-[#1F2937] hover:border-[#A855F7]/40 transition-colors flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-display text-base font-bold text-[#D4E4FA] tracking-wide">
                        {routine.name}
                      </h3>
                      {routine.description && (
                        <p className="font-sans text-xs text-[#8F9380]">
                          {routine.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 font-mono text-[10px] text-[#A855F7] uppercase tracking-wider mt-0.5">
                        <span>{routine.exercises.length} exercícios</span>
                        <span>•</span>
                        <span>{totalSets} séries</span>
                        {routine.lastUsedAt && (
                          <>
                            <span>•</span>
                            <span className="text-[#8F9380]">
                              Último uso:{' '}
                              {new Date(routine.lastUsedAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isDeletingThis || isStartingThis}
                      onClick={() => handleDeleteRoutine(routine.id, routine.name)}
                      className="p-1.5 text-[#8F9380] hover:text-[#FFB4AB] hover:bg-[#FFB4AB]/10 rounded transition-colors disabled:opacity-50"
                      title="Excluir ficha"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Preview dos exercícios */}
                  <div className="flex flex-wrap gap-1.5">
                    {routine.exercises.slice(0, 5).map((ex, i) => (
                      <span
                        key={i}
                        className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#161C24] border border-[#1F2937] text-[#C5C8B4]"
                      >
                        {ex.exerciseNameSnapshot} ({ex.sets?.length || 1}x)
                      </span>
                    ))}
                    {routine.exercises.length > 5 && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#161C24] text-[#8F9380]">
                        +{routine.exercises.length - 5}
                      </span>
                    )}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={isStartingThis}
                    disabled={isStarting || (!!startingRoutineId && !isStartingThis)}
                    onClick={() => handleStart(routine.id)}
                    leftIcon={<Play className="h-3.5 w-3.5 text-[#D4F684]" />}
                    className="w-full justify-center border-[#A855F7]/30 hover:border-[#D4F684] text-[#D4E4FA] bg-[#161C24]"
                  >
                    Iniciar "{routine.name}"
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
