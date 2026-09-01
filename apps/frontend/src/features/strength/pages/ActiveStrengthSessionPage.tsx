import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useActiveStrengthSession } from '../hooks/useActiveStrengthSession';
import { useSessionTimer, formatDuration } from '../hooks/useSessionTimer';
import { useRestTimer } from '../hooks/useRestTimer';
import { useStrengthMutations } from '../hooks/useStrengthMutations';
import { ActiveSessionHeader } from '../components/ActiveSessionHeader';
import { ExerciseEntryCard } from '../components/ExerciseEntryCard';
import { ExerciseSearch } from '../components/ExerciseSearch';
import { RestTimer } from '../components/RestTimer';
import { strengthApi } from '../../../services/strength.api';
import { RpeSelector } from '../../../components/ui/RpeSelector';
import { useAuth } from '../../../contexts/AuthContext';
import type { Exercise, StrengthSet } from '@pacelog/shared';

export const ActiveStrengthSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { session, isLoading, error, setSession } = useActiveStrengthSession();
  const elapsedSeconds = useSessionTimer(session);
  const restTimerHook = useRestTimer();

  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Modal de Finalização (RPE + Notas)
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishRpe, setFinishRpe] = useState<number>(7);
  const [finishNotes, setFinishNotes] = useState<string>('');
  const [isFinishing, setIsFinishing] = useState(false);

  const handleMutationError = useCallback((err: Error) => {
    setMutationError(err.message);
  }, []);

  const mutations = useStrengthMutations(
    session?.id ?? null,
    setSession,
    handleMutationError,
    user?.id,
    session
  );

  const durationMinutes = useMemo(
    () => Math.max(1, Math.round(elapsedSeconds / 60)),
    [elapsedSeconds]
  );

  const completedSetsCount = useMemo(() => {
    if (!session?.exercises) return 0;
    return session.exercises.reduce(
      (acc, ex) => acc + (ex.sets || []).filter((s) => s.status === 'completed').length,
      0
    );
  }, [session?.exercises]);

  const totalVolumeKg = useMemo(() => {
    if (!session?.exercises) return 0;
    return session.exercises.reduce(
      (acc, ex) =>
        acc +
        (ex.sets || [])
          .filter((s) => s.status === 'completed')
          .reduce((sum, s) => sum + (s.load || 0) * (s.reps || 0), 0),
      0
    );
  }, [session?.exercises]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full gap-4 p-8" aria-busy="true">
        <div className="w-10 h-10 rounded-xl bg-[#A855F7]/10 border border-[#A855F7]/30 flex items-center justify-center animate-pulse">
          <div className="w-4 h-4 rounded-full bg-[#A855F7]" />
        </div>
        <span className="font-mono text-xs text-[#8F9380] uppercase tracking-widest animate-pulse">
          Carregando treino ativo…
        </span>
      </div>
    );
  }

  // Redireciona de forma declarativa para /strength caso não haja treino ativo
  if (!session) {
    return <Navigate to="/strength" replace />;
  }

  async function handleSelectExercise(exercise: Exercise) {
    setShowExerciseSearch(false);
    await mutations.addExercise({
      exerciseKey: exercise.key,
      exerciseNameSnapshot: exercise.name,
      primaryMuscleGroup: exercise.primaryMuscleGroup,
      equipment: exercise.equipment,
    });
  }

  async function handleAddSet(exerciseId: string) {
    const exercise = session?.exercises.find((e) => e.id === exerciseId);
    const lastSet = exercise?.sets.filter((s) => s.status === 'completed').at(-1);

    await mutations.addSet({
      exerciseId,
      type: 'working',
      reps: lastSet?.reps,
      load: lastSet?.load,
      loadUnit: lastSet?.loadUnit ?? 'kg',
    });
  }

  async function handleCompleteSet(
    exerciseId: string,
    setId: string,
    data: { reps?: number; load?: number }
  ) {
    await mutations.completeSet({
      exerciseId,
      setId,
      ...data,
    });
    // Iniciar timer de descanso
    restTimerHook.start(90, { exerciseId, setId });
  }

  function handleFinish() {
    if (!session || session.exercises.length === 0) {
      setShowDiscardModal(true);
      return;
    }

    // Calcula RPE sugerido a partir das séries se preenchido
    const completedSetsWithRpe: number[] = [];
    session.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.status === 'completed' && s.rpe != null && s.rpe >= 1 && s.rpe <= 10) {
          completedSetsWithRpe.push(s.rpe);
        }
      });
    });

    if (completedSetsWithRpe.length > 0) {
      const avg = Math.round(
        completedSetsWithRpe.reduce((a, b) => a + b, 0) / completedSetsWithRpe.length
      );
      setFinishRpe(Math.max(1, Math.min(10, avg)));
    } else {
      setFinishRpe(7);
    }

    setShowFinishModal(true);
  }

  async function handleConfirmFinish() {
    if (!session) return;
    setIsFinishing(true);
    try {
      const completed = await strengthApi.finishSession(session.id, {
        rpe: finishRpe,
        notes: finishNotes.trim() || undefined,
      });
      navigate('/strength/review', {
        state: { sessionId: session.id, completedSession: completed },
      });
    } catch (err: any) {
      setMutationError(err?.message || 'Erro ao finalizar treino.');
      setShowFinishModal(false);
    } finally {
      setIsFinishing(false);
    }
  }

  async function handleConfirmDiscard() {
    if (!session) return;
    setIsDiscarding(true);
    try {
      await mutations.cancel();
      navigate('/sessions', { replace: true });
    } catch (err) {
      console.error('Erro ao descartar sessão:', err);
      navigate('/sessions', { replace: true });
    } finally {
      setIsDiscarding(false);
      setShowDiscardModal(false);
    }
  }

  const exercisesList = session?.exercises || [];

  return (
    <div className="flex flex-col h-full bg-[#051424] min-h-screen relative pb-32">
      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-[#051424] border-b border-[#1F2937]">
        <ActiveSessionHeader
          session={session}
          elapsedSeconds={elapsedSeconds}
          onPause={mutations.pause}
          onResume={mutations.resume}
          onFinish={handleFinish}
          onCancel={() => setShowDiscardModal(true)}
          onMinimize={() => navigate('/sessions')}
        />
      </div>

      {/* Timer de descanso (sobreposto quando ativo) */}
      <RestTimer
        timer={restTimerHook.timer}
        onPause={restTimerHook.pause}
        onResume={restTimerHook.resume}
        onReset={restTimerHook.reset}
        onDismiss={restTimerHook.dismiss}
      />

      {/* Erros */}
      {(error || mutationError) && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 m-4 rounded-[4px] flex justify-between items-center text-sm" role="alert">
          {error || mutationError}
          <button onClick={() => setMutationError(null)} className="text-xl leading-none">&times;</button>
        </div>
      )}

      {/* Lista de exercícios */}
      <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto w-full">
        {exercisesList.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 border border-dashed border-[#1F2937] rounded-[4px] gap-2 text-center text-[#8F9380]">
            <p className="font-mono text-sm uppercase">Nenhum exercício adicionado</p>
            <p className="text-xs">Toque em "Adicionar Exercício" para começar seu treino.</p>
          </div>
        )}

        {exercisesList
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((exercise) => (
            <ExerciseEntryCard
              key={exercise.id}
              exercise={exercise}
              onAddSet={handleAddSet}
              onCompleteSet={handleCompleteSet}
              onEditSet={(exerciseId, setId, data) =>
                mutations.editSet(exerciseId, setId, data as Partial<StrengthSet>)
              }
              onRemoveSet={(exerciseId, setId) =>
                mutations.removeSet(exerciseId, setId)
              }
              onRemoveExercise={mutations.removeExercise}
            />
          ))}

        {/* Adicionar exercício */}
        <button
          id="btn-add-exercise"
          className="w-full py-4 mt-2 border border-[#A855F7]/30 text-[#A855F7] hover:bg-[#A855F7]/10 font-mono text-xs uppercase font-bold tracking-widest rounded-[4px] transition-colors flex items-center justify-center gap-2"
          onClick={() => setShowExerciseSearch(true)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Exercício
        </button>
      </div>

      {/* Modal de busca de exercícios */}
      {showExerciseSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" role="presentation">
          <ExerciseSearch
            onSelect={handleSelectExercise}
            onClose={() => setShowExerciseSearch(false)}
          />
        </div>
      )}

      {/* Modal de Finalização do Treino (RPE + Notas) */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in" role="dialog" aria-modal="true">
          <div className="bg-[#0D1C2D] border border-[#A855F7]/40 p-6 rounded-xl max-w-md w-full flex flex-col gap-5 shadow-[0_0_50px_rgba(168,85,247,0.2)]">
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7] animate-pulse" />
                <h3 className="font-display text-lg font-bold text-[#D4E4FA] uppercase tracking-wide">
                  Finalizar Treino
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFinishModal(false)}
                className="text-[#8F9380] hover:text-[#D4E4FA] text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Resumo da Sessão */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-[#161C24] border border-[#1F2937] rounded-lg">
              <div className="flex flex-col items-center">
                <span className="font-mono text-[9px] text-[#8F9380] uppercase">Tempo</span>
                <span className="font-display text-base font-bold text-[#D4E4FA]">
                  {formatDuration(elapsedSeconds)}
                </span>
              </div>
              <div className="flex flex-col items-center border-x border-[#1F2937]">
                <span className="font-mono text-[9px] text-[#8F9380] uppercase">Séries Feitas</span>
                <span className="font-display text-base font-bold text-[#A855F7]">
                  {completedSetsCount} sets
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-mono text-[9px] text-[#8F9380] uppercase">Volume</span>
                <span className="font-display text-base font-bold text-[#D4F684]">
                  {Math.round(totalVolumeKg)} kg
                </span>
              </div>
            </div>

            {/* Percepção Subjetiva de Esforço (RPE) & Notas */}
            <RpeSelector
              rpe={finishRpe}
              onChangeRpe={setFinishRpe}
              durationMinutes={durationMinutes}
              notes={finishNotes}
              onChangeNotes={setFinishNotes}
              notesPlaceholder="Como sentiu o treino? Dor articular, bom pump, ajuste de carga..."
            />

            {/* Botões de Ação */}
            <div className="flex gap-3 mt-1">
              <button
                type="button"
                className="flex-1 py-3 px-3 border border-[#1F2937] text-[#C5C8B4] hover:bg-[#161C24] font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-colors"
                onClick={() => setShowFinishModal(false)}
                disabled={isFinishing}
              >
                Voltar
              </button>
              <button
                type="button"
                className="flex-1 py-3 px-3 bg-gradient-to-r from-[#A855F7] to-[#7B2CBF] text-white hover:opacity-90 font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
                onClick={handleConfirmFinish}
                disabled={isFinishing}
              >
                {isFinishing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando…
                  </>
                ) : (
                  'Concluir Treino'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação para Descartar / Cancelar Sessão */}
      {showDiscardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in" role="dialog" aria-modal="true">
          <div className="bg-[#0D1C2D] border border-[#1F2937] p-6 rounded-[4px] max-w-sm w-full flex flex-col gap-4 shadow-2xl">
            <div className="flex flex-col gap-1.5">
              <h3 className="font-display text-lg font-bold text-[#D4E4FA] uppercase tracking-wide">
                {session?.exercises.length === 0 ? 'Nenhum Exercício Registrado' : 'Descartar Treino?'}
              </h3>
              <p className="font-mono text-xs text-[#8F9380] leading-relaxed">
                {session?.exercises.length === 0
                  ? 'Você ainda não adicionou nenhum exercício nesta sessão. Deseja desistir e descartar este treino?'
                  : 'Tem certeza que deseja desistir desta sessão? O progresso deste treino não será salvo no histórico.'}
              </p>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                className="flex-1 py-2.5 px-3 border border-[#1F2937] text-[#C5C8B4] hover:bg-[#161C24] font-mono text-xs uppercase font-bold tracking-widest rounded-[2px] transition-colors"
                onClick={() => setShowDiscardModal(false)}
                disabled={isDiscarding}
              >
                Voltar
              </button>
              <button
                type="button"
                className="flex-1 py-2.5 px-3 bg-[#FF6B35] text-[#0A0D14] hover:bg-[#e05a2b] font-mono text-xs uppercase font-bold tracking-widest rounded-[2px] transition-colors shadow-[0_0_10px_rgba(255,107,53,0.2)] disabled:opacity-50"
                onClick={handleConfirmDiscard}
                disabled={isDiscarding}
              >
                {isDiscarding ? 'Descartando…' : 'Descartar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
