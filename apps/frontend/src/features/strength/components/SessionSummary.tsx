import React from 'react';
import type { CompletedStrengthSession } from '@pacelog/shared';
import { formatDuration } from '../hooks/useSessionTimer';

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
  const startTime = new Date(session.startedAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = new Date(session.finishedAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full" aria-label="Resumo da sessão">
      <h2 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">Resumo da sessão</h2>

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
