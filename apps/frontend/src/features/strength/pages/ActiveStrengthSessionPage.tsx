import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveStrengthSession } from '../hooks/useActiveStrengthSession';
import { useSessionTimer } from '../hooks/useSessionTimer';
import { useRestTimer } from '../hooks/useRestTimer';
import { useStrengthMutations } from '../hooks/useStrengthMutations';
import { ActiveSessionHeader } from '../components/ActiveSessionHeader';
import { ExerciseEntryCard } from '../components/ExerciseEntryCard';
import { ExerciseSearch } from '../components/ExerciseSearch';
import { RestTimer } from '../components/RestTimer';
import type { Exercise, StrengthSet } from '@pacelog/shared';



export const ActiveStrengthSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, isLoading, error, setSession } = useActiveStrengthSession();
  const elapsedSeconds = useSessionTimer(session);
  const restTimerHook = useRestTimer();

  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const handleMutationError = useCallback((err: Error) => {
    setMutationError(err.message);
  }, []);

  const mutations = useStrengthMutations(
    session?.id ?? null,
    setSession,
    handleMutationError
  );

  // Redireciona para home se não há sessão ativa
  if (!isLoading && !session) {
    navigate('/strength', { replace: true });
    return null;
  }

  if (isLoading) {
    return (
      <div className="active-session active-session--loading" aria-busy="true">
        Carregando sessão…
      </div>
    );
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
    const exercise = session!.exercises.find((e) => e.id === exerciseId);
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

  async function handleFinish() {
    navigate('/strength/review', { state: { sessionId: session!.id } });
  }

  return (
    <div className="flex flex-col h-full bg-[#051424] min-h-screen relative pb-32">
      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-[#051424] border-b border-[#1F2937]">
        <ActiveSessionHeader
          session={session!}
          elapsedSeconds={elapsedSeconds}
          onPause={mutations.pause}
          onResume={mutations.resume}
          onFinish={handleFinish}
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
      <div className="flex flex-col gap-4 p-4">
        {session!.exercises
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
    </div>
  );
};
