import React, { useState, useCallback } from 'react';
import type { StrengthExerciseEntry, StrengthSet, StrengthSetType } from '@pacelog/shared';
import { SetRow } from './SetRow';

interface ExerciseEntryCardProps {
  exercise: StrengthExerciseEntry;
  onAddSet: (exerciseId: string, setType?: StrengthSetType) => void;
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
        <div className="grid grid-cols-[4.5rem_1fr_1fr_3.5rem] gap-2 px-2 py-1 mb-1 font-mono text-[10px] uppercase tracking-widest text-[#8F9380]" aria-hidden="true">
          <span className="text-center">Série / Tipo</span>
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

      <div className="p-2 border-t border-[#1F2937]/50 bg-[#0D1C2D] flex flex-col gap-1.5">
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            id={`btn-add-warmup-set-${exercise.id}`}
            className="py-1.5 px-2 font-mono text-[10px] uppercase font-bold tracking-wider text-[#FFB800] bg-[#FFB800]/10 border border-[#FFB800]/30 hover:bg-[#FFB800]/20 rounded-[3px] transition-colors"
            onClick={() => onAddSet(exercise.id, 'warmup')}
          >
            + Aquecimento
          </button>
          <button
            type="button"
            id={`btn-add-prep-set-${exercise.id}`}
            className="py-1.5 px-2 font-mono text-[10px] uppercase font-bold tracking-wider text-[#5CA9E6] bg-[#5CA9E6]/10 border border-[#5CA9E6]/30 hover:bg-[#5CA9E6]/20 rounded-[3px] transition-colors"
            onClick={() => onAddSet(exercise.id, 'prep')}
          >
            + Preparação
          </button>
          <button
            type="button"
            id={`btn-add-set-${exercise.id}`}
            className="py-1.5 px-2 font-mono text-[10px] uppercase font-bold tracking-wider text-[#D4F684] bg-[#D4F684]/10 border border-[#D4F684]/30 hover:bg-[#D4F684]/20 rounded-[3px] transition-colors"
            onClick={() => onAddSet(exercise.id, 'working')}
          >
            + Válida
          </button>
        </div>
        <p className="font-mono text-[9px] text-[#8F9380] text-center">
          Dica: Toque na tag da série (<span className="text-[#FFB800]">AQ</span> • <span className="text-[#5CA9E6]">PR</span> • <span className="text-[#D4F684]">VL</span>) para alternar o tipo a qualquer momento
        </p>
      </div>
    </div>
  );
};
