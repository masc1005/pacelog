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
    <div className="session-summary" aria-label="Resumo da sessão">
      <h2 className="session-summary__title">Resumo da sessão</h2>

      <div className="session-summary__stats">
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

      <div className="session-summary__exercises">
        {session.exercises.map((exercise) => {
          const completedSets = exercise.sets.filter(
            (s) => s.status === 'completed'
          );
          return (
            <div key={exercise.id} className="session-summary__exercise">
              <span className="session-summary__exercise-name">
                {exercise.exerciseNameSnapshot}
              </span>
              <span className="session-summary__exercise-sets">
                {completedSets.length} séries
              </span>
            </div>
          );
        })}
      </div>

      <div className="session-summary__actions">
        <button
          id="btn-edit-session"
          className="btn btn--secondary"
          onClick={onEdit}
          disabled={isSaving}
        >
          Voltar e editar
        </button>
        <button
          id="btn-save-session"
          className="btn btn--primary"
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
    <div className="session-summary__stat">
      <span className="session-summary__stat-label">{label}</span>
      <span className="session-summary__stat-value">{value}</span>
    </div>
  );
}
