import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { strengthApi } from '../../../services/strength.api';
import { apiClient } from '../../../lib/api';
import { useToast } from '../../../contexts/ToastContext';
import { formatDuration } from '../hooks/useSessionTimer';
import { StrengthInsightCard } from '../components/StrengthInsightCard';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Trash2, ArrowLeft } from 'lucide-react';
import type { CompletedStrengthSession } from '@pacelog/shared';

export const StrengthSessionDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [session, setSession] = useState<CompletedStrengthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;

    strengthApi
      .getSessionById(id)
      .then((s) => setSession(s as CompletedStrengthSession))
      .catch(() => setSession(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await apiClient(`/api/sessions/${id}`, { method: 'DELETE' });
      success('Sessão excluída com sucesso.');
      navigate('/sessions', { replace: true });
    } catch {
      toastError('Erro ao excluir sessão.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]" aria-busy="true">
        <p className="font-mono text-sm text-[#8F9380] animate-pulse uppercase tracking-widest">
          Carregando…
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4" role="alert">
        <p className="font-mono text-sm text-[#FF6B35] bg-[#FF6B35]/10 px-4 py-2 rounded-[4px] border border-[#FF6B35]/50">
          Sessão não encontrada.
        </p>
        <button className="px-4 py-2 border border-[#1F2937] text-[#C5C8B4] hover:bg-[#161C24] font-mono text-xs uppercase tracking-widest rounded-[2px]" onClick={() => navigate('/sessions')}>
          Voltar para Treinos
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
    <div className="flex flex-col max-w-2xl mx-auto w-full p-4 sm:p-0 gap-6 pb-24">
      <header className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <button
          className="flex items-center gap-2 font-mono text-xs text-[#8F9380] hover:text-[#D4E4FA] transition-colors"
          onClick={() => navigate('/sessions')}
          aria-label="Voltar para Histórico"
        >
          <ArrowLeft className="h-4 w-4" />
          Histórico
        </button>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          className="text-[#FFB4AB] border-[#FFB4AB]/20 hover:bg-[#FFB4AB]/10 hover:border-[#FFB4AB]"
          onClick={() => setShowDeleteConfirm(true)}
        >
          Excluir
        </Button>
      </header>

      <section className="flex flex-col p-4 bg-[#0D1C2D] border border-[#1F2937] rounded-[4px]">
        <p className="font-mono text-sm text-[#D4F684] mb-2">{date}</p>
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#8F9380] uppercase tracking-widest">
          <span>{formatDuration(session.durationSeconds)}</span>
          <span className="text-[#1F2937]">/</span>
          <span>{session.exercises.length} exercícios</span>
          <span className="text-[#1F2937]">/</span>
          <span>{session.completedSets} séries</span>
          {session.totalVolumeKg != null && (
            <>
              <span className="text-[#1F2937]">/</span>
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

      {/* Insight de IA */}
      <StrengthInsightCard sessionId={id!} />

      <section className="flex flex-col gap-6">
        {session.exercises.map((exercise) => (
          <div key={exercise.id} className="flex flex-col bg-[#161C24] border border-[#1F2937] rounded-[4px] overflow-hidden">
            <div className="p-4 bg-[#051424] border-b border-[#1F2937]">
              <h3 className="font-display font-bold text-[#D4E4FA]">
                {exercise.exerciseNameSnapshot}
              </h3>
            </div>

            <div className="flex flex-col">
              <div className="grid grid-cols-4 px-4 py-2 bg-[#161C24] border-b border-[#1F2937] font-mono text-[10px] uppercase text-[#8F9380] tracking-widest" aria-hidden="true">
                <span>Série</span>
                <span>Reps</span>
                <span>Carga</span>
                <span>RPE</span>
              </div>

              {exercise.sets
                .filter((s) => s.status === 'completed')
                .map((set) => (
                  <div key={set.id} className="grid grid-cols-4 px-4 py-3 bg-[#161C24] border-b border-[#1F2937]/50 font-mono text-sm text-[#D4E4FA] last:border-0">
                    <span className="text-[#8F9380]">{set.setNumber}</span>
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
        <section className="flex flex-col gap-2 p-4 bg-[#161C24] border border-[#1F2937] rounded-[4px]">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#8F9380]">Observações</h3>
          <p className="text-sm text-[#C5C8B4] whitespace-pre-wrap">{session.notes}</p>
        </section>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <Card className="p-6 max-w-sm w-full bg-[#161C24] border-[#FFB4AB]/30 flex flex-col gap-4">
            <h3 className="font-display text-lg font-bold text-[#FFB4AB] uppercase">Excluir Sessão?</h3>
            <p className="font-mono text-xs text-[#C5C8B4]">Esta ação é irreversível. Os dados de telemetria desta sessão serão permanentemente removidos.</p>
            <div className="flex gap-3 mt-2">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} className="flex-1">Cancelar</Button>
              <Button
                variant="tactile"
                isLoading={isDeleting}
                onClick={handleDelete}
                className="flex-1 bg-[#FFB4AB]/20 text-[#FFB4AB] border-[#FFB4AB]/30 hover:bg-[#FFB4AB]/30"
              >
                Confirmar Exclusão
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
