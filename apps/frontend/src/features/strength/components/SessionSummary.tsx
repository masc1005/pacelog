import React, { useState } from 'react';
import type { CompletedStrengthSession } from '@pacelog/shared';
import { formatDuration } from '../hooks/useSessionTimer';
import { strengthApi } from '../../../services/strength.api';
import { useToast } from '../../../contexts/ToastContext';
import { Bookmark, Check } from 'lucide-react';

interface SessionSummaryProps {
  session: CompletedStrengthSession;
  onSave: () => void;
  onEdit: () => void;
  isSaving?: boolean;
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({
  session,
  onSave,
  onEdit,
  isSaving = false,
}) => {
  const { success, error: toastError } = useToast();
  const [showRoutineInput, setShowRoutineInput] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [isCreatingRoutine, setIsCreatingRoutine] = useState(false);
  const [routineSaved, setRoutineSaved] = useState(false);

  const startTime = new Date(session.startedAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = new Date(session.finishedAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineName.trim() || isCreatingRoutine) return;
    setIsCreatingRoutine(true);
    try {
      await strengthApi.createRoutine({
        name: routineName.trim(),
        sessionId: session.id,
      });
      setRoutineSaved(true);
      setShowRoutineInput(false);
      success(`Ficha "${routineName.trim()}" salva para seus próximos treinos!`);
    } catch (err: any) {
      toastError(err?.message || 'Erro ao salvar ficha.');
    } finally {
      setIsCreatingRoutine(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full" aria-label="Resumo da sessão">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
          Resumo da sessão
        </h2>

        {!routineSaved ? (
          <button
            type="button"
            onClick={() => setShowRoutineInput((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#A855F7]/15 border border-[#A855F7]/40 text-[#A855F7] hover:bg-[#A855F7]/25 font-mono text-xs uppercase tracking-wider transition-colors"
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Salvar como Ficha</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#D4F684]/15 border border-[#D4F684]/40 text-[#D4F684] font-mono text-xs uppercase tracking-wider">
            <Check className="h-3.5 w-3.5" />
            <span>Ficha Salva</span>
          </span>
        )}
      </div>

      {showRoutineInput && (
        <form
          onSubmit={handleCreateRoutine}
          className="flex flex-col sm:flex-row gap-2 p-4 bg-[#161C24] border border-[#A855F7]/40 rounded-[4px]"
        >
          <input
            type="text"
            required
            minLength={2}
            maxLength={80}
            placeholder="Nome da Ficha (ex: Ficha A - Superiores)"
            value={routineName}
            onChange={(e) => setRoutineName(e.target.value)}
            className="flex-1 bg-[#0D1C2D] border border-[#1F2937] focus:border-[#A855F7] text-[#D4E4FA] font-sans text-sm rounded-[4px] px-3 py-2 outline-none"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowRoutineInput(false)}
              className="px-3 py-2 border border-[#1F2937] text-[#8F9380] hover:text-[#D4E4FA] font-mono text-xs uppercase rounded-[4px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreatingRoutine}
              className="px-4 py-2 bg-[#A855F7] text-white hover:bg-[#9333EA] font-mono text-xs uppercase font-bold rounded-[4px] disabled:opacity-50"
            >
              {isCreatingRoutine ? 'Salvando…' : 'Confirmar'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryStat
          label="Duração"
          value={formatDuration(session.durationSeconds)}
        />
        <SummaryStat
          label="Exercícios"
          value={String(session.exercises.length)}
        />
        <SummaryStat
          label="Séries"
          value={`${session.completedSets}/${session.totalSets}`}
        />
        <SummaryStat
          label="Repetições"
          value={String(session.totalReps)}
        />
        {session.totalVolumeKg != null && (
          <SummaryStat
            label="Volume"
            value={`${session.totalVolumeKg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`}
          />
        )}
        {session.estimatedOneRepMax != null && (
          <SummaryStat
            label="1RM estimado"
            value={`${session.estimatedOneRepMax} kg`}
          />
        )}
        <SummaryStat label="Início" value={startTime} />
        <SummaryStat label="Término" value={endTime} />
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <h3 className="font-mono text-xs uppercase tracking-widest text-[#8F9380] mb-2">Exercícios Concluídos</h3>
        {session.exercises.map((exercise) => {
          const completedSets = exercise.sets.filter(
            (s) => s.status === 'completed'
          );
          return (
            <div key={exercise.id} className="flex items-center justify-between p-4 bg-[#161C24] border border-[#1F2937] rounded-[4px]">
              <span className="font-display font-bold text-[#D4E4FA]">
                {exercise.exerciseNameSnapshot}
              </span>
              <span className="font-mono text-sm text-[#D4F684]">
                {completedSets.length} séries
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        <button
          id="btn-edit-session"
          className="flex items-center justify-center gap-2 py-4 px-4 bg-[#161C24] border border-[#1F2937] text-[#C5C8B4] hover:bg-[#1F2937] hover:text-[#D4E4FA] font-mono text-sm uppercase font-bold tracking-widest rounded-[2px] transition-colors"
          onClick={onEdit}
          disabled={isSaving}
        >
          Voltar e editar
        </button>
        <button
          id="btn-save-session"
          className="flex items-center justify-center gap-2 py-4 px-4 bg-[#D4F684] text-[#0A0D14] hover:bg-[#bce65c] font-mono text-sm uppercase font-bold tracking-widest rounded-[2px] transition-colors shadow-[0_0_20px_rgba(212,246,132,0.2)] hover:shadow-[0_0_30px_rgba(212,246,132,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? 'Salvando…' : 'Salvar sessão'}
        </button>
      </div>
    </div>
  );
};

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col p-4 bg-[#0D1C2D] border border-[#1F2937] rounded-[4px]">
      <span className="font-mono text-[10px] uppercase tracking-widest text-[#8F9380] mb-1">{label}</span>
      <span className="font-display text-lg font-bold text-[#D4E4FA]">{value}</span>
    </div>
  );
}
