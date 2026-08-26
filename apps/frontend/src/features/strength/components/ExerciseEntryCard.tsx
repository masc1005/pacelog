import React, { useState, useCallback } from 'react';
import type { StrengthExerciseEntry, StrengthSet } from '@pacelog/shared';
import { SetRow } from './SetRow';

interface ExerciseEntryCardProps {
  exercise: StrengthExerciseEntry;
  onAddSet: (exerciseId: string) => void;
  onCompleteSet: (
    exerciseId: string,
    setId: string,
    data: { reps?: number; load?: number }
  ) => void;
  onEditSet: (
    exerciseId: string,
    setId: string,
    data: Partial<StrengthSet>
  ) => void;
  onRemoveSet: (exerciseId: string, setId: string) => void;
  onRemoveExercise: (exerciseId: string) => void;
}

export const ExerciseEntryCard: React.FC<ExerciseEntryCardProps> = ({
  exercise,
  onAddSet,
  onCompleteSet,
  onEditSet,
  onRemoveSet,
  onRemoveExercise,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleRemoveExercise = useCallback(() => {
    if (window.confirm(`Remover "${exercise.exerciseNameSnapshot}" e todas as suas séries?`)) {
      onRemoveExercise(exercise.id);
    }
    setShowMenu(false);
  }, [exercise.id, exercise.exerciseNameSnapshot, onRemoveExercise]);

  const lastCompletedSet = exercise.sets.filter((s) => s.status === 'completed').at(-1);

  return (
    <div className="flex flex-col bg-[#0D1C2D] border border-[#1F2937] rounded-[4px] overflow-hidden" id={`exercise-${exercise.id}`}>
      <div className="flex items-center justify-between p-4 bg-[#161C24] border-b border-[#1F2937]">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-[#D4E4FA] text-base">{exercise.exerciseNameSnapshot}</h3>
          {exercise.primaryMuscleGroup && (
            <span className="px-2 py-0.5 rounded-[2px] bg-[#A855F7]/10 text-[#A855F7] font-mono text-[10px] uppercase font-bold tracking-widest">
              {exercise.primaryMuscleGroup}
            </span>
          )}
        </div>

        <div className="relative">
          <button
            id={`btn-exercise-menu-${exercise.id}`}
            className="flex items-center justify-center w-8 h-8 rounded-[2px] text-[#8F9380] hover:text-[#D4E4FA] hover:bg-[#051424] transition-colors"
            onClick={() => setShowMenu((v) => !v)}
            aria-label={`Menu do exercício ${exercise.exerciseNameSnapshot}`}
            aria-expanded={showMenu}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
          </button>

          {showMenu && (
            <div
              className="absolute right-0 mt-1 w-48 bg-[#161C24] border border-[#1F2937] rounded-[4px] shadow-lg z-20 py-1"
              role="menu"
              aria-label="Opções do exercício"
            >
              <button
                className="w-full text-left px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#FF6B35] hover:bg-[#FF6B35]/10"
                onClick={handleRemoveExercise}
                role="menuitem"
              >
                Remover exercício
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col p-2 gap-1">
        {/* Linha de cabeçalho */}
        <div className="grid grid-cols-[3rem_1fr_1fr_3rem] gap-2 px-2 py-1 mb-1 font-mono text-[10px] uppercase tracking-widest text-[#8F9380]" aria-hidden="true">
          <span className="text-center">Série</span>
          <span className="text-center">Reps</span>
          <span className="text-center">Carga</span>
          <span></span>
        </div>

        {exercise.sets.map((set) => (
          <SetRow
            key={set.id}
            set={set}
            exerciseId={exercise.id}
            previousSet={lastCompletedSet}
            onComplete={(setId, data) =>
              onCompleteSet(exercise.id, setId, data)
            }
            onEdit={(setId, data) => onEditSet(exercise.id, setId, data)}
            onRemove={(setId) => onRemoveSet(exercise.id, setId)}
          />
        ))}
      </div>

      <div className="p-2 border-t border-[#1F2937]/50 bg-[#0D1C2D]">
        <button
          id={`btn-add-set-${exercise.id}`}
          className="w-full py-2 font-mono text-xs uppercase font-bold tracking-widest text-[#C5C8B4] hover:text-[#D4E4FA] hover:bg-[#161C24] rounded-[2px] transition-colors"
          onClick={() => onAddSet(exercise.id)}
        >
          + Adicionar série
        </button>
      </div>
    </div>
  );
};
