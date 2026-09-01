import React, { useState, useEffect } from 'react';
import type { StrengthSet } from '@pacelog/shared';

interface SetRowProps {
  set: StrengthSet;
  exerciseId: string;
  previousSet?: StrengthSet;
  onComplete: (setId: string, data: { reps?: number; load?: number }) => void;
  onEdit: (setId: string, data: Partial<StrengthSet>) => void;
  onRemove: (setId: string) => void;
}

export const SetRow: React.FC<SetRowProps> = React.memo(({
  set,
  previousSet,
  onComplete,
  onEdit,
  onRemove,
}) => {
  const [reps, setReps] = useState<string>(
    String(set.reps ?? previousSet?.reps ?? '')
  );
  const [load, setLoad] = useState<string>(
    String(set.load ?? previousSet?.load ?? '')
  );

  useEffect(() => {
    if (set.reps != null) {
      setReps(String(set.reps));
    }
    if (set.load != null) {
      setLoad(String(set.load));
    }
  }, [set.reps, set.load]);

  const isCompleted = set.status === 'completed';
  const isSkipped = set.status === 'skipped';

  function handleComplete() {
    onComplete(set.id, {
      reps: reps ? Number(reps) : undefined,
      load: load ? Number(load) : undefined,
    });
  }

  function handleUndo() {
    onEdit(set.id, { status: 'planned' });
  }

  return (
    <div
      className={`grid grid-cols-[3rem_1fr_1fr_3rem] gap-2 items-center px-2 py-1 rounded-[2px] transition-colors ${
        isCompleted ? 'bg-[#D4F684]/10' : isSkipped ? 'opacity-50' : ''
      }`}
      id={`set-${set.id}`}
      role="row"
    >
      {/* Número da série */}
      <span className="font-mono text-xs font-bold text-center text-[#8F9380]" aria-label={`Série ${set.setNumber}`}>
        {set.type === 'warmup' ? 'W' : set.setNumber}
      </span>

      {/* Repetições */}
      <div className="flex justify-center">
        <input
          id={`reps-${set.id}`}
          type="number"
          className={`w-full max-w-[60px] text-center font-display text-lg font-bold bg-transparent border-b-2 outline-none transition-colors ${
            isCompleted ? 'text-[#D4F684] border-transparent' : 'text-[#D4E4FA] border-[#1F2937] focus:border-[#D4F684]'
          }`}
          placeholder={String(previousSet?.reps ?? '—')}
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          onBlur={() => {
            if (isCompleted) {
              onEdit(set.id, { reps: reps ? Number(reps) : undefined });
            }
          }}
          min={1}
          aria-label={`Repetições, série ${set.setNumber}`}
          inputMode="numeric"
        />
      </div>

      {/* Carga */}
      <div className="flex justify-center">
        {set.loadUnit === 'bodyweight' ? (
          <span className="font-mono text-[10px] uppercase text-[#8F9380] text-center">Peso<br/>Corporal</span>
        ) : (
          <input
            id={`load-${set.id}`}
            type="number"
            className={`w-full max-w-[60px] text-center font-display text-lg font-bold bg-transparent border-b-2 outline-none transition-colors ${
              isCompleted ? 'text-[#D4F684] border-transparent' : 'text-[#D4E4FA] border-[#1F2937] focus:border-[#D4F684]'
            }`}
            placeholder={String(previousSet?.load ?? '—')}
            value={load}
            onChange={(e) => setLoad(e.target.value)}
            onBlur={() => {
              if (isCompleted) {
                onEdit(set.id, { load: load ? Number(load) : undefined });
              }
            }}
            step={0.5}
            min={0}
            aria-label={`Carga em ${set.loadUnit}, série ${set.setNumber}`}
            inputMode="decimal"
          />
        )}
      </div>

      {/* Ação principal */}
      <div className="flex items-center justify-center gap-1">
        {isCompleted ? (
          <button
            id={`btn-undo-${set.id}`}
            className="flex items-center justify-center w-7 h-7 rounded-[2px] bg-[#D4F684] text-[#0A0D14] font-bold shadow-[0_0_10px_rgba(212,246,132,0.3)] transition-all"
            onClick={handleUndo}
            aria-label={`Desfazer conclusão da série ${set.setNumber}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </button>
        ) : (
          <button
            id={`btn-complete-${set.id}`}
            className="flex items-center justify-center w-7 h-7 rounded-[2px] bg-[#161C24] border border-[#1F2937] text-[#8F9380] hover:text-[#D4F684] hover:border-[#D4F684] transition-all"
            onClick={handleComplete}
            aria-label={`Concluir série ${set.setNumber}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </button>
        )}
        <button
          id={`btn-remove-set-${set.id}`}
          className="flex items-center justify-center w-7 h-7 rounded-[2px] text-[#8F9380] hover:bg-red-500/10 hover:text-red-500 transition-colors"
          onClick={() => onRemove(set.id)}
          aria-label={`Remover série ${set.setNumber}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
});
