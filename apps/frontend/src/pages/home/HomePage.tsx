import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { AIProgressInsight } from '../../components/ui/AIProgressInsight';
import { LoadSummaryCard } from '../../components/progress/LoadSummaryCard';
import { SportDistributionCard } from '../../components/progress/SportDistributionCard';
import { ShoeUsageSummary } from '../../components/shoes/ShoeUsageSummary';
import { shoeApi } from '../../services/shoe.api';
import {
  Flame,
  Zap,
  ArrowRight,
  Dumbbell,
  Sun,
  Activity,
  Waves,
} from 'lucide-react';
import {
  SPORT_KEYS,
  type SportKey,
  type SessionSummaryDTO,
  type ProgressSummaryDTO,
  type ProgressBySportDTO,
  type RunningShoe,
} from '@pacelog/shared';
import { formatPace, formatDuration } from '../../lib/utils';
import { apiClient } from '../../lib/api';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedSport, setSelectedSport] = useState<SportKey | 'all'>('all');
  const [summary, setSummary] = useState<SessionSummaryDTO | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progressSummary, setProgressSummary] = useState<ProgressSummaryDTO | null>(null);
  const [shoes, setShoes] = useState<RunningShoe[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [summaryData, sessionsData, progressData, shoesData] = await Promise.all([
          apiClient<SessionSummaryDTO>('/api/sessions/summary?timeframe=week').catch(() => null),
          apiClient<any[]>('/api/sessions?limit=6').catch(() => []),
          apiClient<ProgressSummaryDTO>('/api/progress/summary?period=7').catch(() => null),
          shoeApi.getShoes(false).catch(() => []),
        ]);

        if (summaryData) setSummary(summaryData);
        if (sessionsData && Array.isArray(sessionsData)) setSessions(sessionsData);
        if (shoesData) setShoes(shoesData);
        if (progressData) {
          setProgressSummary(progressData);

          if (progressData.distribution?.length > 0) {
            const sportKeys = progressData.distribution.map((d: any) => d.sportKey);
            await Promise.allSettled(
              sportKeys.map((key) =>
                apiClient<ProgressBySportDTO>(`/api/progress/by-sport/${key}`).catch(() => null)
              )
            );
          }
        }
      } catch {
        // Silencioso em caso de inicialização offline
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const sportMeta: Record<
    SportKey,
    { name: string; color: string; badge: 'cyan' | 'green' | 'amber' | 'crimson' | 'purple' | 'blue'; icon: any }
  > = {
    running: { name: 'Corrida', color: '#5CA9E6', badge: 'cyan', icon: Activity },
    football: { name: 'Futebol', color: '#D4F684', badge: 'green', icon: Flame },
    futevolei: { name: 'Futevôlei', color: '#FFB800', badge: 'amber', icon: Sun },
    boxing: { name: 'Boxe', color: '#FF6B35', badge: 'crimson', icon: Zap },
    strength: { name: 'Musculação', color: '#A855F7', badge: 'purple', icon: Dumbbell },
    swimming: { name: 'Natação', color: '#38BDF8', badge: 'blue', icon: Waves },
  };

  const filteredSessions =
    selectedSport === 'all'
      ? sessions
      : sessions.filter((s) => s.sportKey === selectedSport);

  const totalWeeklyDurationMins = Math.round((summary?.totalDurationSeconds || 0) / 60);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 p-4 animate-pulse">
        <div className="h-4 bg-[#1F2937] w-1/4 rounded" />
        <div className="h-32 bg-[#051424] rounded border border-[#1F2937]" />
        <div className="h-32 bg-[#0D1C2D] rounded border border-[#1F2937]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 font-sans text-[#D4E4FA] relative">
      {/* Athlete Status Sub-header */}
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-2 -mb-2">
        <span className="font-mono text-[11px] text-[#C5C8B4] uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#D4F684] rounded-full" />
          ATLETA // {user?.name || 'SESSÃO PRINCIPAL'}
        </span>
        <span className="font-mono text-[10px] text-[#8F9380] uppercase">TELEMETRIA ATIVA</span>
      </div>

      {/* ==========================================
          1. INSIGHT DE ANÁLISE E TÊNIS
      ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AIProgressInsight />
        <ShoeUsageSummary 
          defaultShoe={shoes.find(s => s.isDefault) || shoes[0]} 
          activeShoesCount={shoes.length} 
        />
      </div>

      {/* ==========================================
          2. ÚLTIMA SESSÃO
      ========================================== */}
      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-baseline border-b border-[#1F2937] pb-2">
          <h2 className="font-mono text-xs font-bold text-[#D4E4FA] uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#D4F684] rounded-full" />
            ÚLTIMO REGISTRO
          </h2>
          <span className="font-mono text-[11px] text-[#8F9380]">
            {sessions[0]
              ? new Date(sessions[0].startedAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })
              : 'NENHUM REGISTRO'}
          </span>
        </div>

        {sessions[0] ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1 border-l-2 border-[#1F2937] pl-3 py-2 bg-[#0D1C2D]/50 rounded-r-[2px]">
              <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider">
                MODALIDADE
              </span>
              <span className="font-display text-xl font-bold text-[#D4E4FA] uppercase">
                {sessions[0].sportKey}
              </span>
            </div>
            <div className="flex flex-col gap-1 border-l-2 border-[#1F2937] pl-3 py-2 bg-[#0D1C2D]/50 rounded-r-[2px]">
              <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider">
                DURAÇÃO
              </span>
              <span className="font-display text-xl font-bold text-[#D4E4FA]">
                {formatDuration(sessions[0].durationSeconds)}
              </span>
            </div>
            <div className="flex flex-col gap-1 border-l-2 border-[#1F2937] pl-3 py-2 bg-[#0D1C2D]/50 rounded-r-[2px]">
              <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider">
                PERCEPÇÃO (RPE)
              </span>
              <span className="font-display text-xl font-bold text-[#FF6B35]">
                {sessions[0].rpe}/10
              </span>
            </div>
            <div className="flex flex-col gap-1 border-l-2 border-[#1F2937] pl-3 py-2 bg-[#0D1C2D]/50 rounded-r-[2px]">
              <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider">
                CARGA sRPE
              </span>
              <span className="font-display text-xl font-bold text-[#D4F684]">
                {sessions[0].sessionalLoad}
              </span>
            </div>
          </div>
        ) : (
          <Card className="p-8 flex flex-col items-center justify-center gap-2 border-dashed border-[#454839]">
            <span className="font-mono text-[10px] text-[#8F9380] uppercase">
              Nenhum treino registrado ainda
            </span>
          </Card>
        )}
      </section>

      {/* ==========================================
          4. CONSISTÊNCIA DA SEMANA
      ========================================== */}
      {summary && (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs font-bold text-[#D4E4FA] uppercase tracking-widest border-b border-[#1F2937] pb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#D4F684] rounded-full" />
            CONSISTÊNCIA DA SEMANA
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0D1C2D] p-4 border border-[#1F2937] rounded-[2px] flex flex-col gap-1">
              <span className="font-mono text-[10px] text-[#8F9380] uppercase">Sessões</span>
              <span className="font-display text-2xl font-bold text-[#D4E4FA]">
                {summary.totalSessions ?? '--'}
              </span>
            </div>
            <div className="bg-[#0D1C2D] p-4 border border-[#1F2937] rounded-[2px] flex flex-col gap-1">
              <span className="font-mono text-[10px] text-[#8F9380] uppercase">Tempo total</span>
              <span className="font-display text-2xl font-bold text-[#D4E4FA]">
                {Math.floor(totalWeeklyDurationMins / 60)}h{totalWeeklyDurationMins % 60}m
              </span>
            </div>
            <div className="bg-[#0D1C2D] p-4 border border-[#1F2937] rounded-[2px] flex flex-col gap-1">
              <span className="font-mono text-[10px] text-[#8F9380] uppercase">RPE médio</span>
              <span className="font-display text-2xl font-bold text-[#FF6B35]">
                {summary.averageRpe ? summary.averageRpe.toFixed(1) : '--'}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ==========================================
          5. CARGA PERCEBIDA (SECUNDÁRIO)
      ========================================== */}
      {progressSummary && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
            <h2 className="font-mono text-xs font-bold text-[#C5C8B4] uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#5CA9E6] rounded-full" />
              CARGA PERCEBIDA
            </h2>
            <Link
              to="/progress"
              className="text-xs font-mono text-[#5CA9E6] hover:underline flex items-center gap-1 uppercase font-bold tracking-wider"
            >
              Detalhe <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <LoadSummaryCard load={progressSummary.load} />
          {progressSummary.distribution.length > 0 && (
            <SportDistributionCard
              distribution={progressSummary.distribution}
              totalSrpe={progressSummary.load.currentSrpe}
            />
          )}
        </section>
      )}

      {/* ==========================================
          6. TREINOS RECENTES + FILTROS
      ========================================== */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-[#C5C8B4]">
            TREINOS RECENTES
          </h2>
          <Link
            to="/sessions"
            className="text-xs font-mono text-[#D4F684] hover:underline flex items-center gap-1 uppercase font-bold tracking-wider"
          >
            Ver histórico <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Filtros por esporte */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedSport('all')}
            className={`px-3.5 py-1.5 rounded-[2px] text-xs font-mono font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border ${selectedSport === 'all'
              ? 'bg-[#D4F684] text-[#051424] border-[#D4F684] font-bold shadow-[0_0_12px_rgba(212,246,132,0.25)]'
              : 'bg-[#161C24] text-[#8F9380] border-[#1F2937] hover:text-[#D4E4FA] hover:border-[#454839]'
              }`}
          >
            Todas ({sessions.length})
          </button>

          {SPORT_KEYS.map((key) => {
            const meta = sportMeta[key];
            const isSelected = selectedSport === key;
            const Icon = meta.icon;

            return (
              <button
                key={key}
                onClick={() => setSelectedSport(key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-[2px] text-xs font-mono font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border ${isSelected
                  ? 'bg-[#161C24] text-[#D4E4FA] border-[#D4F684] shadow-[0_0_12px_rgba(212,246,132,0.15)]'
                  : 'bg-[#161C24] text-[#8F9380] border-[#1F2937] hover:text-[#D4E4FA] hover:border-[#454839]'
                  }`}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                <span>{meta.name}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.length === 0 ? (
            <div className="col-span-full py-8 flex justify-center border border-dashed border-[#1F2937] rounded-[2px]">
              <span className="font-mono text-xs text-[#8F9380] uppercase">
                Nenhum treino registrado
              </span>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const meta = sportMeta[session.sportKey as SportKey] || sportMeta.running;
              const Icon = meta.icon;

              return (
                <Card
                  key={session.id}
                  variant="watch"
                  interactive
                  className="flex flex-col justify-between p-5 bg-[#161C24] border-[#1F2937] hover:border-[#454839] transition-all group cursor-pointer"
                  onClick={() => navigate(session.sportKey === 'strength' ? `/strength/sessions/${session.id}` : `/sessions/${session.id}`)}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="sage" size="sm">
                        <Icon className="h-3 w-3 inline mr-1" />
                        {meta.name}
                      </Badge>
                      <span className="font-mono text-[10px] text-[#8F9380]">
                        {new Date(session.startedAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-[#0D1C2D] rounded-[2px] p-3 border border-[#1F2937]">
                      {session.sportKey === 'running' && (
                        <>
                          <div>
                            <span className="font-mono text-[9px] text-[#8F9380] uppercase block">
                              Distância
                            </span>
                            <span className="font-display text-lg font-bold text-[#D4E4FA]">
                              {session.metrics?.distanceMeters
                                ? (session.metrics.distanceMeters / 1000).toFixed(1)
                                : '--'}{' '}
                              km
                            </span>
                          </div>
                          <div>
                            <span className="font-mono text-[9px] text-[#8F9380] uppercase block">
                              Pace Médio
                            </span>
                            <span className="font-display text-lg font-bold text-[#5CA9E6]">
                              {session.metrics?.paceSecondsPerKm
                                ? formatPace(session.metrics.paceSecondsPerKm)
                                : '--'}
                            </span>
                          </div>
                        </>
                      )}

                      {session.sportKey === 'boxing' && (
                        <>
                          <div>
                            <span className="font-mono text-[9px] text-[#8F9380] uppercase block">
                              Rounds
                            </span>
                            <span className="font-display text-lg font-bold text-[#D4E4FA]">
                              {session.metrics?.roundsCount || '--'} rounds
                            </span>
                          </div>
                          <div>
                            <span className="font-mono text-[9px] text-[#8F9380] uppercase block">
                              Golpes Est.
                            </span>
                            <span className="font-display text-lg font-bold text-[#FF6B35]">
                              {session.metrics?.punchesThrownEstimate || '--'}
                            </span>
                          </div>
                        </>
                      )}

                      {session.sportKey === 'strength' && (
                        <>
                          <div>
                            <span className="font-mono text-[9px] text-[#8F9380] uppercase block">
                              Volume
                            </span>
                            <span className="font-display text-lg font-bold text-[#D4E4FA]">
                              {session.metrics?.totalVolumeKg
                                ? `${Math.round(session.metrics.totalVolumeKg)} kg`
                                : '--'}
                            </span>
                          </div>
                          <div>
                            <span className="font-mono text-[9px] text-[#8F9380] uppercase block">
                              Séries
                            </span>
                            <span className="font-display text-lg font-bold text-[#A855F7]">
                              {session.metrics?.totalSets || '--'} sets
                            </span>
                          </div>
                        </>
                      )}

                      {session.sportKey === 'swimming' && (
                        <>
                          <div>
                            <span className="font-mono text-[9px] text-[#8F9380] uppercase block">
                              Distância
                            </span>
                            <span className="font-display text-lg font-bold text-[#D4E4FA]">
                              {session.metrics?.totalDistanceMeters
                                ? `${session.metrics.totalDistanceMeters} m`
                                : '--'}
                            </span>
                          </div>
                          <div>
                            <span className="font-mono text-[9px] text-[#8F9380] uppercase block">
                              Pace
                            </span>
                            <span className="font-display text-lg font-bold text-[#38BDF8]">
                              {session.metrics?.paceSecondsPer100m
                                ? `${Math.floor(session.metrics.paceSecondsPer100m / 60)}:${(session.metrics.paceSecondsPer100m % 60).toString().padStart(2, '0')}/100m`
                                : '--'}
                            </span>
                          </div>
                        </>
                      )}

                      {(session.sportKey === 'football' || session.sportKey === 'futevolei') && (
                        <>
                          <div>
                            <span className="font-mono text-[9px] text-[#8F9380] uppercase block">
                              Duração
                            </span>
                            <span className="font-display text-lg font-bold text-[#D4E4FA]">
                              {formatDuration(session.durationSeconds)}
                            </span>
                          </div>
                          <div>
                            <span className="font-mono text-[9px] text-[#8F9380] uppercase block">
                              Carga sRPE
                            </span>
                            <span className="font-display text-lg font-bold text-[#D4F684]">
                              {session.sessionalLoad}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#1F2937] text-xs font-mono text-[#8F9380]">
                    <div className="flex items-center gap-1.5">
                      <span>{formatDuration(session.durationSeconds)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px]">RPE</span>
                      <span className="font-bold text-[#D4E4FA] bg-[#0D1C2D] px-1.5 py-0.5 rounded-[2px] text-[10px] border border-[#1F2937]">
                        {session.rpe || '--'}/10
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
