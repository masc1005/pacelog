import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import type { SessionDTO, SportKey } from '@pacelog/shared';
import { formatDuration } from '../../lib/utils';
import { Activity, Zap, Sun, Dumbbell, Flame, Pencil, Trash2, ArrowLeft, Sparkles, RefreshCw, Waves } from 'lucide-react';
import type { AIInsightDTO } from '@pacelog/shared';

const sportMeta: Record<SportKey, { name: string; color: string; icon: any; badge: 'cyan'|'amber'|'crimson'|'purple'|'green'|'blue' }> = {
  running: { name: 'Corrida', color: '#5CA9E6', icon: Activity, badge: 'cyan' },
  football: { name: 'Futebol', color: '#D4F684', icon: Flame, badge: 'green' },
  futevolei: { name: 'Futevôlei', color: '#FFB800', icon: Sun, badge: 'amber' },
  boxing: { name: 'Boxe', color: '#FF6B35', icon: Zap, badge: 'crimson' },
  strength: { name: 'Musculação', color: '#A855F7', icon: Dumbbell, badge: 'purple' },
  swimming: { name: 'Natação', color: '#38BDF8', icon: Waves, badge: 'blue' },
};

export const SessionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [session, setSession] = useState<SessionDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [insight, setInsight] = useState<AIInsightDTO | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiClient<SessionDTO>(`/api/sessions/${id}`);
        setSession(data);
        
        // Tenta buscar insight já existente para esta sessão (falha silenciosamente se não existir)
        try {
          const insightData = await apiClient<AIInsightDTO>(`/api/insights/session/${id}`);
          setInsight(insightData);
        } catch (e) {
          // Ignora, significa que ainda não foi gerado
        }
      } catch {
        toastError('Sessão não encontrada.');
        navigate('/sessions');
      } finally {
        setIsLoading(false);
      }
    }
    if (id) load();
  }, [id, navigate, toastError]);

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

  const handleGenerateInsight = async (force: boolean = false) => {
    if (!id) return;
    setIsGeneratingInsight(true);
    try {
      const url = force ? `/api/insights/session/${id}/generate?force=true` : `/api/insights/session/${id}/generate`;
      const data = await apiClient<AIInsightDTO>(url, { method: 'POST' });
      setInsight(data);
      success('Análise gerada com sucesso!');
    } catch {
      toastError('Erro ao gerar análise da IA.');
    } finally {
      setIsGeneratingInsight(false);
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

      {/* AI Coach Insight */}
      <Card className="p-5 border-[#1F2937] bg-gradient-to-br from-[#0D1C2D] to-[#0A1624] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles className="h-24 w-24 text-[#A855F7]" />
        </div>
        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#A855F7]" />
              <h2 className="font-mono text-[10px] text-[#A855F7] uppercase tracking-widest font-bold">Coach de IA</h2>
            </div>
            {insight && (
              <button 
                onClick={() => handleGenerateInsight(true)}
                disabled={isGeneratingInsight}
                className="text-[#8F9380] hover:text-[#A855F7] transition-colors p-1 rounded hover:bg-[#A855F7]/10 disabled:opacity-50"
                title="Regerar análise"
              >
                <RefreshCw className={`h-4 w-4 ${isGeneratingInsight ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
          
          {insight ? (
            <p className="text-sm text-[#D4E4FA] leading-relaxed font-sans">
              {(() => {
                let text = insight.content;
                if (text.startsWith('```')) {
                  text = text.replace(/```(json)?\n?/g, '').trim();
                }
                try {
                  const data = JSON.parse(text);
                  return data.interpretacao || data.summary || data.headline || insight.content;
                } catch {
                  return text;
                }
              })()}
            </p>
          ) : (
            <div className="flex flex-col gap-3 items-start">
              <p className="text-sm text-[#C5C8B4] leading-relaxed">
                Quer saber como esta sessão se compara com a sua anterior? Peça uma análise tática ao Coach.
              </p>
              <Button 
                variant="tactile" 
                size="sm" 
                className="bg-[#A855F7]/10 text-[#A855F7] border-[#A855F7]/30 hover:bg-[#A855F7]/20"
                onClick={() => handleGenerateInsight(false)}
                isLoading={isGeneratingInsight}
                leftIcon={<Sparkles className="h-4 w-4" />}
              >
                Gerar Análise Tática
              </Button>
            </div>
          )}
        </div>
      </Card>

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
              {session.metrics.elevationGainMeters !== undefined && (
                <div className="flex flex-col gap-1 border-l-2 border-[#5CA9E6] pl-3">
                  <span className="font-mono text-[9px] text-[#8F9380] uppercase">Elevação</span>
                  <span className="font-display text-xl font-bold text-[#5CA9E6]">{session.metrics.elevationGainMeters} m</span>
                </div>
              )}
              {session.metrics.avgHeartRate !== undefined && (
                <div className="flex flex-col gap-1 border-l-2 border-[#5CA9E6] pl-3">
                  <span className="font-mono text-[9px] text-[#8F9380] uppercase">FC Média</span>
                  <span className="font-display text-xl font-bold text-[#5CA9E6]">{session.metrics.avgHeartRate} bpm</span>
                </div>
              )}
            </>}
            {session.sportKey === 'swimming' && <>
              <div className="flex flex-col gap-1 border-l-2 border-[#38BDF8] pl-3">
                <span className="font-mono text-[9px] text-[#8F9380] uppercase">Distância</span>
                <span className="font-display text-xl font-bold text-[#D4E4FA]">{session.metrics.totalDistanceMeters} m</span>
              </div>
              <div className="flex flex-col gap-1 border-l-2 border-[#38BDF8] pl-3">
                <span className="font-mono text-[9px] text-[#8F9380] uppercase">Pace Médio</span>
                <span className="font-display text-xl font-bold text-[#38BDF8]">
                  {session.metrics.paceSecondsPer100m ? `${Math.floor(session.metrics.paceSecondsPer100m / 60)}:${String(Math.floor(session.metrics.paceSecondsPer100m % 60)).padStart(2, '0')}/100m` : '--'}
                </span>
              </div>
              {session.metrics.totalLaps !== undefined && (
                <div className="flex flex-col gap-1 border-l-2 border-[#38BDF8] pl-3">
                  <span className="font-mono text-[9px] text-[#8F9380] uppercase">Piscinas</span>
                  <span className="font-display text-xl font-bold text-[#38BDF8]">{session.metrics.totalLaps}</span>
                </div>
              )}
              {session.metrics.swolf !== undefined && (
                <div className="flex flex-col gap-1 border-l-2 border-[#38BDF8] pl-3">
                  <span className="font-mono text-[9px] text-[#8F9380] uppercase">SWOLF</span>
                  <span className="font-display text-xl font-bold text-[#38BDF8]">{session.metrics.swolf}</span>
                </div>
              )}
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
              {session.metrics.focusArea && (
                <div className="flex flex-col gap-1 border-l-2 border-[#FF6B35] pl-3">
                  <span className="font-mono text-[9px] text-[#8F9380] uppercase">Foco</span>
                  <span className="font-display text-sm font-bold text-[#FF6B35] uppercase">{String(session.metrics.focusArea).replace('_', ' ')}</span>
                </div>
              )}
              {session.metrics.sparring && (
                <div className="flex flex-col gap-1 border-l-2 border-[#FF6B35] pl-3">
                  <span className="font-mono text-[9px] text-[#8F9380] uppercase">Sparring</span>
                  <span className="font-display text-xl font-bold text-[#FF6B35]">Sim</span>
                </div>
              )}
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
              {session.metrics.totalReps !== undefined && (
                <div className="flex flex-col gap-1 border-l-2 border-[#A855F7] pl-3">
                  <span className="font-mono text-[9px] text-[#8F9380] uppercase">Repetições</span>
                  <span className="font-display text-xl font-bold text-[#A855F7]">{session.metrics.totalReps}</span>
                </div>
              )}
            </>}
            {session.sportKey === 'football' && <>
              <div className="flex flex-col gap-1 border-l-2 border-[#D4F684] pl-3">
                <span className="font-mono text-[9px] text-[#8F9380] uppercase">Gols</span>
                <span className="font-display text-xl font-bold text-[#D4F684]">{session.metrics.goals || 0}</span>
              </div>
              <div className="flex flex-col gap-1 border-l-2 border-[#D4F684] pl-3">
                <span className="font-mono text-[9px] text-[#8F9380] uppercase">Assistências</span>
                <span className="font-display text-xl font-bold text-[#D4F684]">{session.metrics.assists || 0}</span>
              </div>
              {session.metrics.matchResult && (
                <div className="flex flex-col gap-1 border-l-2 border-[#D4F684] pl-3">
                  <span className="font-mono text-[9px] text-[#8F9380] uppercase">Resultado</span>
                  <span className="font-display text-sm font-bold text-[#D4F684] uppercase">
                    {session.metrics.matchResult === 'win' ? 'Vitória' : session.metrics.matchResult === 'loss' ? 'Derrota' : 'Empate'}
                  </span>
                </div>
              )}
              {session.metrics.position && (
                <div className="flex flex-col gap-1 border-l-2 border-[#D4F684] pl-3">
                  <span className="font-mono text-[9px] text-[#8F9380] uppercase">Posição</span>
                  <span className="font-display text-sm font-bold text-[#D4F684] uppercase">{session.metrics.position}</span>
                </div>
              )}
            </>}
            {session.sportKey === 'futevolei' && <>
              <div className="flex flex-col gap-1 border-l-2 border-[#FFB800] pl-3">
                <span className="font-mono text-[9px] text-[#8F9380] uppercase">Sets</span>
                <span className="font-display text-xl font-bold text-[#FFB800]">{session.metrics.setsCount}</span>
              </div>
              {session.metrics.successfulReceptions !== undefined && (
                <div className="flex flex-col gap-1 border-l-2 border-[#FFB800] pl-3">
                  <span className="font-mono text-[9px] text-[#8F9380] uppercase">Recepções</span>
                  <span className="font-display text-xl font-bold text-[#FFB800]">{session.metrics.successfulReceptions}</span>
                </div>
              )}
              {session.metrics.successfulSets !== undefined && (
                <div className="flex flex-col gap-1 border-l-2 border-[#FFB800] pl-3">
                  <span className="font-mono text-[9px] text-[#8F9380] uppercase">Levantadas</span>
                  <span className="font-display text-xl font-bold text-[#FFB800]">{session.metrics.successfulSets}</span>
                </div>
              )}
              {session.metrics.successfulAttacks !== undefined && (
                <div className="flex flex-col gap-1 border-l-2 border-[#FFB800] pl-3">
                  <span className="font-mono text-[9px] text-[#8F9380] uppercase">Ataques</span>
                  <span className="font-display text-xl font-bold text-[#FFB800]">{session.metrics.successfulAttacks}</span>
                </div>
              )}
              {session.metrics.serves !== undefined && (
                <div className="flex flex-col gap-1 border-l-2 border-[#FFB800] pl-3">
                  <span className="font-mono text-[9px] text-[#8F9380] uppercase">Saques</span>
                  <span className="font-display text-xl font-bold text-[#FFB800]">{session.metrics.serves}</span>
                </div>
              )}
              {session.metrics.aces !== undefined && (
                <div className="flex flex-col gap-1 border-l-2 border-[#FFB800] pl-3">
                  <span className="font-mono text-[9px] text-[#8F9380] uppercase">Aces</span>
                  <span className="font-display text-xl font-bold text-[#FFB800]">{session.metrics.aces}</span>
                </div>
              )}
              {session.metrics.attackErrors !== undefined && (
                <div className="flex flex-col gap-1 border-l-2 border-[#FFB800] pl-3">
                  <span className="font-mono text-[9px] text-[#8F9380] uppercase">Erros de Ataque</span>
                  <span className="font-display text-xl font-bold text-[#FFB800]">{session.metrics.attackErrors}</span>
                </div>
              )}
              {session.metrics.partnerName && (
                <div className="flex flex-col gap-1 border-l-2 border-[#FFB800] pl-3">
                  <span className="font-mono text-[9px] text-[#8F9380] uppercase">Dupla</span>
                  <span className="font-display text-sm font-bold text-[#FFB800] truncate">{session.metrics.partnerName}</span>
                </div>
              )}
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
