import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { strengthApi } from '../../../services/strength.api';
import { formatDuration } from '../hooks/useSessionTimer';
import type { CompletedStrengthSession } from '@pacelog/shared';

export const StrengthSessionDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<CompletedStrengthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    strengthApi
      .getSessionById(id)
      .then((s) => setSession(s as CompletedStrengthSession))
      .catch(() => setSession(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="session-details session-details--loading" aria-busy="true">
        Carregando…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="session-details session-details--error" role="alert">
        <p>Sessão não encontrada.</p>
        <button className="btn btn--secondary" onClick={() => navigate(-1)}>
          Voltar
        </button>
      </div>
    );
  }

  const date = new Date(session.startedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="session-details">
      <header className="session-details__header">
        <button
          className="btn-icon btn-icon--ghost"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
        >
          ←
        </button>
        <h1 className="session-details__title">Detalhes do treino</h1>
      </header>

      <section className="session-details__meta">
        <p className="session-details__date">{date}</p>
        <div className="session-details__stats">
          <span>{formatDuration(session.durationSeconds)}</span>
          <span>·</span>
          <span>{session.exercises.length} exercícios</span>
          <span>·</span>
          <span>{session.completedSets} séries</span>
          {session.totalVolumeKg != null && (
            <>
              <span>·</span>
              <span>
                {session.totalVolumeKg.toLocaleString('pt-BR', {
                  maximumFractionDigits: 0,
                })}{' '}
                kg
              </span>
            </>
          )}
        </div>
      </section>

      <section className="session-details__exercises">
        {session.exercises.map((exercise) => (
          <div key={exercise.id} className="session-details__exercise">
            <h3 className="session-details__exercise-name">
              {exercise.exerciseNameSnapshot}
            </h3>

            <div className="session-details__sets">
              <div className="session-details__set-header" aria-hidden="true">
                <span>Série</span>
                <span>Reps</span>
                <span>Carga</span>
                <span>RPE</span>
              </div>

              {exercise.sets
                .filter((s) => s.status === 'completed')
                .map((set) => (
                  <div key={set.id} className="session-details__set-row">
                    <span>{set.setNumber}</span>
                    <span>{set.reps ?? '—'}</span>
                    <span>
                      {set.loadUnit === 'bodyweight'
                        ? 'Peso corp.'
                        : set.load != null
                        ? `${set.load} ${set.loadUnit}`
                        : '—'}
                    </span>
                    <span>{set.rpe ?? '—'}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </section>

      {session.notes && (
        <section className="session-details__notes">
          <h3>Observações</h3>
          <p>{session.notes}</p>
        </section>
      )}
    </div>
  );
};
