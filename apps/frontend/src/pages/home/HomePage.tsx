import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { AIProgressInsight } from '../../components/ui/AIProgressInsight';
import { LoadSummaryCard } from '../../components/progress/LoadSummaryCard';
import { SportDistributionCard } from '../../components/progress/SportDistributionCard';
import { SportProgressSummary } from '../../components/progress/SportProgressSummary';
import {
  Flame,
  Zap,
  Plus,
  ArrowRight,
  Dumbbell,
  Sun,
  Activity,
  Bed,
  Bolt,
} from 'lucide-react';
import { SPORT_KEYS, type SportKey, type SessionSummaryDTO, type ProgressSummaryDTO, type ProgressBySportDTO } from '@pacelog/shared';
import { formatPace, formatDuration } from '../../lib/utils';
import { apiClient } from '../../lib/api';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedSport, setSelectedSport] = useState<SportKey | 'all'>('all');
  const [summary, setSummary] = useState<SessionSummaryDTO | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // V2 — dados contextualizados de progresso
  const [progressSummary, setProgressSummary] = useState<ProgressSummaryDTO | null>(null);
  const [sportProgressList, setSportProgressList] = useState<ProgressBySportDTO[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [summaryData, sessionsData, progressData] = await Promise.all([
          apiClient<SessionSummaryDTO>('/api/sessions/summary?timeframe=week').catch(() => null),
          apiClient<any[]>('/api/sessions?limit=6').catch(() => []),
          apiClient<ProgressSummaryDTO>('/api/progress/summary?period=7').catch(() => null),
        ]);

        if (summaryData) setSummary(summaryData);
        if (sessionsData && Array.isArray(sessionsData)) setSessions(sessionsData);
        if (progressData) {
          setProgressSummary(progressData);

          // Buscar progresso por esporte apenas dos que tiveram sessões
          if (progressData.distribution?.length > 0) {
            const sportKeys = progressData.distribution.map(d => d.sportKey);
            const sportProgressResults = await Promise.allSettled(
              sportKeys.map(key =>
                apiClient<ProgressBySportDTO>(`/api/progress/by-sport/${key}`).catch(() => null)
              )
            );
            const fulfilled = sportProgressResults
              .filter((r): r is PromiseFulfilledResult<ProgressBySportDTO> => r.status === 'fulfilled' && r.value !== null)
              .map(r => r.value);
            setSportProgressList(fulfilled);
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
    { name: string; color: string; badge: 'cyan' | 'green' | 'amber' | 'crimson' | 'purple'; icon: any }
  > = {
    running: { name: 'Corrida', color: '#5CA9E6', badge: 'cyan', icon: Activity },
    football: { name: 'Futebol', color: '#D4F684', badge: 'green', icon: Flame },
    futevolei: { name: 'Futevôlei', color: '#FFB800', badge: 'amber', icon: Sun },
    boxing: { name: 'Boxe', color: '#FF6B35', badge: 'crimson', icon: Zap },
    strength: { name: 'Musculação', color: '#A855F7', badge: 'purple', icon: Dumbbell },
  };

  const filteredSessions =
    selectedSport === 'all'
      ? sessions
      : sessions.filter((s) => s.sportKey === selectedSport);

  const totalWeeklyDurationMins = Math.round((summary?.totalDurationSeconds || 0) / 60);
  const totalWeeklyLoad = summary?.totalSessionalLoad || 0;
  const avgIntensity = summary?.averageRpe || 0;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 p-4 animate-pulse">
        <div className="h-4 bg-[#1F2937] w-1/4 rounded"></div>
        <div className="h-64 bg-[#051424] rounded border border-[#1F2937]"></div>
        <div className="h-32 bg-[#0D1C2D] rounded border border-[#1F2937]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 font-sans text-[#D4E4FA] relative">
      {/* Ambient Scanline & Grid Effect from Stitch */}
      <div className="path-line pointer-events-none" />

      {/* Athlete Status Sub-header */}
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-2 -mb-2">
        <span className="font-mono text-[11px] text-[#C5C8B4] uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#D4F684] rounded-full"></span>
          ATLETA // {user?.name || 'SESSÃO PRINCIPAL'}
        </span>
        <span className="font-mono text-[10px] text-[#8F9380] uppercase">
          TELEMETRIA ATIVA
        </span>
      </div>

      {/* AI Progress Insight Widget */}
      <AIProgressInsight />

      {/* 1. Section: Chronograph Dashboard matching Stitch PACELOG: Performance Premium */}
      <section className="flex flex-col md:flex-row gap-6 lg:gap-10 items-center md:items-start justify-center bg-[#051424] p-6 lg:p-8 rounded-[2px] border border-[#1F2937] relative overflow-hidden">
        {/* Main Dial (Dual-track tactical SVG gauge) */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex-shrink-0 group flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90 drop-shadow-xl" viewBox="0 0 100 100">
            {/* Outer Track */}
            <circle className="svg-dial-track" cx="50" cy="50" r="45" />
            {/* Progress Arc (Tactile Orange) */}
            <circle
              className="svg-dial-progress"
              cx="50"
              cy="50"
              r="45"
              strokeDasharray="282.7"
              strokeDashoffset="75"
            />
            {/* Inner Track */}
            <circle className="svg-dial-track" cx="50" cy="50" r="35" strokeWidth="2" />
            {/* Inner Progress (Electric Blue) */}
            <circle
              className="svg-dial-progress svg-dial-secondary"
              cx="50"
              cy="50"
              r="35"
              strokeDasharray="219.9"
              strokeDashoffset="85"
              strokeWidth="2"
            />
            {/* Tactical Ticks */}
            <g className="stroke-[#1D2630]" strokeWidth="0.6">
              <line x1="50" x2="50" y1="0" y2="4" />
              <line x1="50" x2="50" y1="96" y2="100" />
              <line x1="0" x2="4" y1="50" y2="50" />
              <line x1="96" x2="100" y1="50" y2="50" />
            </g>
          </svg>

          {/* Central Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-mono text-[10px] text-[#C5C8B4] uppercase tracking-widest mb-0.5">
              Carga Semanal
            </span>
            <span className="font-display text-4xl sm:text-5xl font-bold text-[#D4E4FA] tabular-nums tracking-tight">
              {totalWeeklyLoad}
            </span>
            <span className="font-mono text-[10px] text-[#D4F684] tracking-wider mt-0.5 font-bold uppercase">
              FOSTER sRPE
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-4 mt-2 font-mono text-[8px] sm:text-[9px] uppercase tracking-wider font-bold whitespace-nowrap">
          <div className="flex items-center gap-1.5 text-[#FF6B35]">
            <span className="w-2 h-2 rounded-full bg-[#FF6B35]"></span>
            Carga Atual (7d)
          </div>
          <div className="flex items-center gap-1.5 text-[#5CA9E6]">
            <span className="w-2 h-2 rounded-full bg-[#5CA9E6]"></span>
            Baseline (28d)
          </div>
        </div>

        {/* Supporting Metrics Blocks (Bento Style from Stitch) */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto md:flex-grow h-full justify-center">
          {/* Block 1: Intensity Factor */}
          <div className="bg-[#0D1C2D] p-4 border border-[#1F2937] flex flex-col gap-2 flex-1 group hover:bg-[#161D26] transition-colors relative overflow-hidden rounded-[2px]">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#FF6B35] scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom" />
            <div className="flex justify-between items-start">
              <span className="font-mono text-[10px] text-[#C5C8B4] uppercase tracking-widest">
                FATOR DE INTENSIDADE
              </span>
              <Bolt className="h-4 w-4 text-[#5CA9E6]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-[#D4E4FA]">
                {avgIntensity}
              </span>
              <span className="font-mono text-[10px] text-[#8F9380] uppercase">
                ALVO: 8.0 RPE
              </span>
            </div>
          </div>

          {/* Block 2: Recovery / Time in Effort */}
          <div className="bg-[#0D1C2D] p-4 border border-[#1F2937] flex flex-col gap-2 flex-1 group hover:bg-[#161D26] transition-colors relative overflow-hidden rounded-[2px]">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#5CA9E6] scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom" />
            <div className="flex justify-between items-start">
              <span className="font-mono text-[10px] text-[#C5C8B4] uppercase tracking-widest">
                TEMPO EM ESFORÇO
              </span>
              <Bed className="h-4 w-4 text-[#C5C8B4]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-[#D4E4FA]">
                {Math.floor(totalWeeklyDurationMins / 60)}h {totalWeeklyDurationMins % 60}m
              </span>
              <span className="font-mono text-[10px] text-[#D4F684] uppercase">
                ESTA SEMANA
              </span>
            </div>
          </div>

          {/* Action CTA Button in Stitch Tactile Orange */}
          <Link to="/sessions/new" className="mt-2">
            <Button
              variant="tactile"
              size="lg"
              leftIcon={<Plus className="h-4 w-4" />}
              className="w-full tracking-widest"
            >
              REGISTRAR TREINO
            </Button>
          </Link>
        </div>
      </section>

      {/* 2. Section: Last Session Precision Data matching Stitch */}
      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-baseline border-b border-[#1F2937] pb-2">
          <h2 className="font-mono text-xs font-bold text-[#D4E4FA] uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#D4F684] rounded-full"></span>
            ÚLTIMO REGISTRO DE TELEMETRIA
          </h2>
          <span className="font-mono text-[11px] text-[#8F9380]">
            {sessions[0] ? new Date(sessions[0].startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'NENHUM REGISTRO'}
          </span>
        </div>

        {sessions[0] ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1 border-l-2 border-[#1F2937] pl-3 py-2 bg-[#0D1C2D]/50 rounded-r-[2px]">
              <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider">MODALIDADE</span>
              <span className="font-display text-xl font-bold text-[#D4E4FA] uppercase">{sessions[0].sportKey}</span>
            </div>
            <div className="flex flex-col gap-1 border-l-2 border-[#1F2937] pl-3 py-2 bg-[#0D1C2D]/50 rounded-r-[2px]">
              <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider">DURAÇÃO TOTAL</span>
              <span className="font-display text-xl font-bold text-[#D4E4FA]">{formatDuration(sessions[0].durationSeconds)}</span>
            </div>
            <div className="flex flex-col gap-1 border-l-2 border-[#1F2937] pl-3 py-2 bg-[#0D1C2D]/50 rounded-r-[2px]">
              <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider">PERCEPÇÃO (RPE)</span>
              <span className="font-display text-xl font-bold text-[#FF6B35]">{sessions[0].rpe}/10</span>
            </div>
            <div className="flex flex-col gap-1 border-l-2 border-[#1F2937] pl-3 py-2 bg-[#0D1C2D]/50 rounded-r-[2px]">
              <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider">CARGA sRPE</span>
              <span className="font-display text-xl font-bold text-[#D4F684]">{sessions[0].sessionalLoad}</span>
            </div>
          </div>
        ) : (
          <Card className="p-8 flex flex-col items-center justify-center gap-2 border-dashed border-[#454839]">
            <span className="font-mono text-[10px] text-[#8F9380] uppercase">Ainda sem dados para exibir</span>
          </Card>
        )}
      </section>

      {/* ==========================================
          SEÇÃO V2 — CARGA E PROGRESSO CONTEXTUALIZADO
          Substitui "métrica alta" por dados contextualizados.
          Aparece somente se houver dados do endpoint V2.
      ========================================== */}
      {progressSummary && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
            <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#C5C8B4] flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#D4F684] rounded-full" />
              CARGA E PROGRESSO
            </h2>
            <Link
              to="/progress"
              className="text-xs font-mono text-[#D4F684] hover:underline flex items-center gap-1 uppercase font-bold tracking-wider"
            >
              Ver análise completa <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Progresso por esporte (Prioridade 1) */}
          {sportProgressList.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest">
                Progresso relativo por modalidade
              </p>
              <SportProgressSummary
                sports={sportProgressList}
                onSportClick={(key) => navigate(`/progress/${key}`)}
              />
            </div>
          )}

          {/* Card de carga percebida (Prioridade 2) */}
          <div className="mt-2">
             <LoadSummaryCard load={progressSummary.load} />
          </div>

          {/* Distribuição por esporte */}
          {progressSummary.distribution.length > 0 && (
            <SportDistributionCard
              distribution={progressSummary.distribution}
              totalSrpe={progressSummary.load.currentSrpe}
            />
          )}

          {/* Explicações determinísticas */}
          {progressSummary.explanations.length > 0 && (
            <div className="flex flex-col gap-2">
              {progressSummary.explanations.map((exp, i) => (
                <p key={i} className="font-mono text-xs text-[#8F9380] flex items-start gap-2">
                  <span className="text-[#4A5568] mt-0.5">→</span>
                  {exp}
                </p>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3. Sport Filters & Categories */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#C5C8B4]">
            MODALIDADES ESPORTIVAS
          </h2>
          <span className="text-[11px] font-mono text-[#8F9380]">5 esportes</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedSport('all')}
            className={`px-3.5 py-1.5 rounded-[2px] text-xs font-mono font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border ${
              selectedSport === 'all'
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-[2px] text-xs font-mono font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border ${
                  isSelected
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
      </section>

      {/* 4. Recent Sessions Feed matching Stitch Diário Minimalista */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#C5C8B4]">
            DIÁRIO DE TREINOS RECENTES
          </h2>
          <Link
            to="/sessions"
            className="text-xs font-mono text-[#D4F684] hover:underline flex items-center gap-1 uppercase font-bold tracking-wider"
          >
            Ver histórico <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.length === 0 ? (
            <div className="col-span-full py-8 flex justify-center border border-dashed border-[#1F2937] rounded-[2px]">
              <span className="font-mono text-xs text-[#8F9380] uppercase">Nenhum treino registrado</span>
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
                  className="flex flex-col justify-between p-5 bg-[#161C24] border-[#1F2937] hover:border-[#454839] transition-all group"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="sage" size="sm">
                        <Icon className="h-3 w-3 inline mr-1" />
                        {meta.name}
                      </Badge>
                      <span className="font-mono text-[10px] text-[#8F9380]">
                        {new Date(session.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-[#0D1C2D] rounded-[2px] p-3 border border-[#1F2937]">
                      {session.sportKey === 'running' && (
                        <>
                          <div>
                            <span className="font-mono text-[9px] text-[#8F9380] uppercase block">Distância</span>
                            <span className="font-display text-lg font-bold text-[#D4E4FA]">
                              {session.metrics?.distanceMeters ? (session.metrics.distanceMeters / 1000).toFixed(1) : '--'} km
                            </span>
                          </div>
                          <div>
                            <span className="font-mono text-[9px] text-[#8F9380] uppercase block">Pace Médio</span>
                            <span className="font-display text-lg font-bold text-[#5CA9E6]">
                              {session.metrics?.paceSecondsPerKm ? formatPace(session.metrics.paceSecondsPerKm) : '--'}
                            </span>
                          </div>
                        </>
                      )}

                      {session.sportKey === 'boxing' && (
                        <>
                          <div>
                            <span className="font-mono text-[9px] text-[#8F9380] uppercase block">Rounds</span>
                            <span className="font-display text-lg font-bold text-[#D4E4FA]">
                              {session.metrics?.roundsCount || '--'} rounds
                            </span>
                          </div>
                          <div>
                            <span className="font-mono text-[9px] text-[#8F9380] uppercase block">Golpes Est.</span>
                            <span className="font-display text-lg font-bold text-[#FF6B35]">
                              {session.metrics?.punchesThrownEstimate || '--'}
                            </span>
                          </div>
                        </>
                      )}

                      {session.sportKey === 'strength' && (
                        <>
                          <div>
                            <span className="font-mono text-[9px] text-[#8F9380] uppercase block">Volume</span>
                            <span className="font-display text-lg font-bold text-[#D4E4FA]">
                              {session.metrics?.totalVolumeKg ? `${Math.round(session.metrics.totalVolumeKg)} kg` : '--'}
                            </span>
                          </div>
                          <div>
                            <span className="font-mono text-[9px] text-[#8F9380] uppercase block">Séries</span>
                            <span className="font-display text-lg font-bold text-[#A855F7]">
                              {session.metrics?.totalSets || '--'} sets
                            </span>
                          </div>
                        </>
                      )}

                      {(session.sportKey === 'football' || session.sportKey === 'futevolei') && (
                        <>
                          <div>
                            <span className="font-mono text-[9px] text-[#8F9380] uppercase block">Duração</span>
                            <span className="font-display text-lg font-bold text-[#D4E4FA]">
                              {formatDuration(session.durationSeconds)}
                            </span>
                          </div>
                          <div>
                            <span className="font-mono text-[9px] text-[#8F9380] uppercase block">Carga sRPE</span>
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
