import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import type { SessionDTO, SportKey } from '@pacelog/shared';
import { formatDuration } from '../../lib/utils';
import { Activity, Zap, Sun, Dumbbell, Flame, Pencil, Trash2, ArrowLeft } from 'lucide-react';

const sportMeta: Record<SportKey, { name: string; color: string; icon: any; badge: 'cyan'|'amber'|'crimson'|'purple'|'green' }> = {
  running: { name: 'Corrida', color: '#5CA9E6', icon: Activity, badge: 'cyan' },
  football: { name: 'Futebol', color: '#D4F684', icon: Flame, badge: 'green' },
  futevolei: { name: 'Futevôlei', color: '#FFB800', icon: Sun, badge: 'amber' },
  boxing: { name: 'Boxe', color: '#FF6B35', icon: Zap, badge: 'crimson' },
  strength: { name: 'Musculação', color: '#A855F7', icon: Dumbbell, badge: 'purple' },
};

export const SessionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [session, setSession] = useState<SessionDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiClient<SessionDTO>(`/api/sessions/${id}`);
        setSession(data);
      } catch {
        toastError('Sessão não encontrada.');
        navigate('/sessions');
      } finally {
        setIsLoading(false);
      }
    }
    if (id) load();
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
      <div className="flex justify-center items-center min-h-[200px]">
        <span className="font-mono text-xs text-[#8F9380] animate-pulse">Carregando sessão...</span>
      </div>
    );
  }

  if (!session) return null;

  const meta = sportMeta[session.sportKey] || sportMeta.running;
  const Icon = meta.icon;

  return (
    <div className="flex flex-col gap-6 font-sans max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <Link to="/sessions" className="flex items-center gap-2 font-mono text-xs text-[#8F9380] hover:text-[#D4E4FA] transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Histórico
        </Link>
        <div className="flex gap-2">
          <Link to={`/sessions/${id}/edit`}>
            <Button variant="secondary" size="sm" leftIcon={<Pencil className="h-3.5 w-3.5" />}>Editar</Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            className="text-[#FFB4AB] border-[#FFB4AB]/20 hover:bg-[#FFB4AB]/10 hover:border-[#FFB4AB]"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Excluir
          </Button>
        </div>
      </div>

      {/* Hero section */}
      <Card variant="watch" className="p-6 bg-[#0D1C2D] border-[#1F2937] flex items-center gap-5">
        <div className="w-16 h-16 rounded-[2px] bg-[#051424] border border-[#1F2937] flex items-center justify-center">
          <Icon className="h-8 w-8" style={{ color: meta.color }} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase">{meta.name}</h1>
            <Badge variant={meta.badge} size="sm">Completo</Badge>
          </div>
          <span className="font-mono text-xs text-[#8F9380]">
            {new Date(session.startedAt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </Card>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Duração', value: formatDuration(session.durationSeconds), color: '#D4E4FA' },
          { label: 'RPE', value: `${session.rpe}/10`, color: '#FF6B35' },
          { label: 'Carga sRPE', value: session.sessionalLoad, color: '#D4F684' },
          { label: 'Status', value: 'CONCLUÍDO', color: '#5CA9E6' },
        ].map(m => (
          <Card key={m.label} className="p-4 border-[#1F2937] bg-[#161C24] flex flex-col gap-1">
            <span className="font-mono text-[9px] text-[#8F9380] uppercase tracking-wider">{m.label}</span>
            <span className="font-display text-lg font-bold" style={{ color: m.color }}>{m.value}</span>
          </Card>
        ))}
      </div>

      {/* Sport Specific Metrics */}
      {session.metrics && Object.keys(session.metrics).length > 0 && (
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937]">
          <h2 className="font-mono text-[10px] text-[#C5C8B4] uppercase tracking-widest mb-4">Dados de Campo</h2>
          <div className="grid grid-cols-2 gap-3">
            {session.sportKey === 'running' && <>
              <div className="flex flex-col gap-1 border-l-2 border-[#5CA9E6] pl-3">
                <span className="font-mono text-[9px] text-[#8F9380] uppercase">Distância</span>
                <span className="font-display text-xl font-bold text-[#D4E4FA]">{((session.metrics.distanceMeters || 0) / 1000).toFixed(1)} km</span>
              </div>
              <div className="flex flex-col gap-1 border-l-2 border-[#5CA9E6] pl-3">
                <span className="font-mono text-[9px] text-[#8F9380] uppercase">Pace médio</span>
                <span className="font-display text-xl font-bold text-[#5CA9E6]">
                  {session.metrics.paceSecondsPerKm ? `${Math.floor(session.metrics.paceSecondsPerKm / 60)}:${String(session.metrics.paceSecondsPerKm % 60).padStart(2, '0')}/km` : '--'}
                </span>
              </div>
            </>}
            {session.sportKey === 'boxing' && <>
              <div className="flex flex-col gap-1 border-l-2 border-[#FF6B35] pl-3">
                <span className="font-mono text-[9px] text-[#8F9380] uppercase">Rounds</span>
                <span className="font-display text-xl font-bold text-[#D4E4FA]">{session.metrics.roundsCount}</span>
              </div>
              <div className="flex flex-col gap-1 border-l-2 border-[#FF6B35] pl-3">
                <span className="font-mono text-[9px] text-[#8F9380] uppercase">Golpes Est.</span>
                <span className="font-display text-xl font-bold text-[#FF6B35]">{session.metrics.punchesThrownEstimate || '--'}</span>
              </div>
            </>}
            {session.sportKey === 'strength' && <>
              <div className="flex flex-col gap-1 border-l-2 border-[#A855F7] pl-3">
                <span className="font-mono text-[9px] text-[#8F9380] uppercase">Volume</span>
                <span className="font-display text-xl font-bold text-[#D4E4FA]">{session.metrics.totalVolumeKg} kg</span>
              </div>
              <div className="flex flex-col gap-1 border-l-2 border-[#A855F7] pl-3">
                <span className="font-mono text-[9px] text-[#8F9380] uppercase">Séries</span>
                <span className="font-display text-xl font-bold text-[#A855F7]">{session.metrics.totalSets}</span>
              </div>
            </>}
          </div>
        </Card>
      )}

      {/* Notes */}
      {session.notes && (
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937]">
          <h2 className="font-mono text-[10px] text-[#C5C8B4] uppercase tracking-widest mb-3">Notas Táticas</h2>
          <p className="text-sm text-[#C5C8B4] leading-relaxed">{session.notes}</p>
        </Card>
      )}

      {/* Delete Confirm Modal */}
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
