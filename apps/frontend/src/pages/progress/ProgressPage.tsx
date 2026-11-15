import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import {
  Activity,
  BarChart2,
  Target,
  Trophy,
  AlertTriangle,
  Zap,
  Calendar,
  TrendingUp,
  Sparkles,
  Scale,
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import type {
  ProgressOverviewDTO,
  ProgressSummaryDTO,
  ProgressLoadDTO,
  ProgressComparisonDTO,
  ProgressBySportDTO,
  SportProgressV2,
  SportKey,
} from '@pacelog/shared';
import { SPORT_LABELS } from '../../lib/utils';
import { LoadSummaryCard } from '../../components/progress/LoadSummaryCard';
import { SportDistributionCard } from '../../components/progress/SportDistributionCard';
import { SportProgressSummary } from '../../components/progress/SportProgressSummary';
import { WeekNavigator } from '../../components/progress/WeekNavigator';
import { MuscleFatigueTelemetry } from '../../components/progress/MuscleFatigueTelemetry';
import { AIProgressInsight } from '../../components/ui/AIProgressInsight';

// ==========================================
// ABAS SEGMENTADAS DA PÁGINA
// ==========================================

type Tab = 'load' | 'sports';
type WeightHistory = {
  points: Array<{ dateKey: string; weightKg: number }>;
  currentWeightKg: number | null;
  deltaKg: number;
};

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'load', label: 'Carga & Distribuição', icon: BarChart2 },
  { key: 'sports', label: 'Esportes', icon: TrendingUp },
];

// ==========================================
// PÁGINA
// ==========================================

export const ProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('load');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [isWeekLoading, setIsWeekLoading] = useState<boolean>(false);

  const [data, setData] = useState<ProgressOverviewDTO | null>(null);
  const [summary, setSummary] = useState<ProgressSummaryDTO | null>(null);
  const [loadData, setLoadData] = useState<ProgressLoadDTO | null>(null);
  const [comparison, setComparison] = useState<ProgressComparisonDTO | null>(null);
  const [sportProgressList, setSportProgressList] = useState<SportProgressV2[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightHistory | null>(null);
  const [deloadNeed, setDeloadNeed] = useState<{ needed: boolean; reasons: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWeekSummary = async (offset: number) => {
    setIsWeekLoading(true);
    try {
      const nextSummary = await apiClient<ProgressSummaryDTO>(
        `/api/progress/summary?weekOffset=${offset}`
      ).catch(() => null);
      if (nextSummary) setSummary(nextSummary);
    } finally {
      setIsWeekLoading(false);
    }
  };

  const handlePrevWeek = () => {
    const next = weekOffset - 1;
    setWeekOffset(next);
    loadWeekSummary(next);
  };

  const handleNextWeek = () => {
    if (weekOffset >= 0) return;
    const next = weekOffset + 1;
    setWeekOffset(next);
    loadWeekSummary(next);
  };

  const handleResetWeek = () => {
    setWeekOffset(0);
    loadWeekSummary(0);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [overviewData, summaryData, loadTimeline, compData, weightData, deloadData] =
          await Promise.all([
            apiClient<ProgressOverviewDTO>('/api/progress/overview').catch(() => null),
            apiClient<ProgressSummaryDTO>('/api/progress/summary?weekOffset=0').catch(() => null),
            apiClient<ProgressLoadDTO>('/api/progress/load').catch(() => null),
            apiClient<ProgressComparisonDTO>('/api/progress/comparison?period=30').catch(() => null),
            apiClient<WeightHistory>('/api/progress/weight-history').catch(() => null),
            apiClient<{ needed: boolean; reasons: string[] }>('/api/progress/deload').catch(() => null),
          ]);

        if (overviewData) setData(overviewData);
        if (summaryData) setSummary(summaryData);
        if (loadTimeline) setLoadData(loadTimeline);
        if (compData) setComparison(compData);
        if (weightData) setWeightHistory(weightData);
        if (deloadData) setDeloadNeed(deloadData);

        const sportKeysSet = new Set<SportKey>();
        summaryData?.distribution?.forEach((d) => sportKeysSet.add(d.sportKey));
        overviewData?.sportsBreakdown?.forEach((s) => sportKeysSet.add(s.sportKey));
        compData?.sports?.forEach((s) => sportKeysSet.add(s.sportKey));

        if (sportKeysSet.size > 0) {
          const results = await Promise.allSettled(
            Array.from(sportKeysSet).map((key) =>
              apiClient<ProgressBySportDTO>(`/api/progress/by-sport/${key}`)
            )
          );
          const loaded = results
            .filter(
              (r): r is PromiseFulfilledResult<ProgressBySportDTO> =>
                r.status === 'fulfilled' && Boolean(r.value)
            )
            .map((r) => r.value)
            .sort((a, b) => b.sessionsCount - a.sessionsCount);
          setSportProgressList(loaded);
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar telemetria');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4F684]" />
      </div>
    );
  }

  if (error && !data && !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertTriangle className="h-10 w-10 text-[#FF6B35]" />
        <p className="font-mono text-sm text-[#8F9380] uppercase">{error || 'Dados indisponíveis'}</p>
      </div>
    );
  }

  void comparison;

  return (
    <div className="flex flex-col gap-4 font-sans max-w-4xl mx-auto w-full pb-24">
      {/* Header compacto + atalhos em linha */}
      <div className="flex items-center justify-between gap-3 border-b border-[#1F2937] pb-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
          Progresso
        </h1>
        <div className="flex items-center gap-2">
          <Link
            to="/progress/goals"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#0D1C2D] border border-[#1F2937] hover:border-[#D4F684]/50 font-mono text-[10px] font-bold text-[#D4E4FA] uppercase tracking-wider transition-colors"
          >
            <Target className="h-3.5 w-3.5 text-[#D4F684]" aria-hidden="true" />
            <span>Metas</span>
          </Link>
          <Link
            to="/progress/insights"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#0D1C2D] border border-[#1F2937] hover:border-[#A855F7]/50 font-mono text-[10px] font-bold text-[#D4E4FA] uppercase tracking-wider transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#A855F7]" aria-hidden="true" />
            <span>Insights</span>
          </Link>
        </div>
      </div>

      {/* Navegador semanal compacto no topo */}
      <WeekNavigator
        weekOffset={weekOffset}
        periodLabel={summary?.period?.label}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onResetWeek={handleResetWeek}
        isLoading={isWeekLoading}
      />

      {/* Banner de IA recolhível de 1 linha */}
      <AIProgressInsight />

      {/* Resumo principal de carga */}
      {summary && (
        <LoadSummaryCard
          load={summary.load}
          deloadNeed={deloadNeed ?? undefined}
          compact
        />
      )}

      {/* Controle Segmentado (Tabs) */}
      <div
        role="tablist"
        aria-label="Seções de progresso"
        className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#0B1521] border border-[#1F2937]"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                active
                  ? 'bg-[#D4F684] text-[#051424] shadow-sm'
                  : 'text-[#8F9380] hover:text-[#D4E4FA]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==========================================
          ABA 1: CARGA & DISTRIBUIÇÃO
      ========================================== */}
      {activeTab === 'load' && (
        <div className="flex flex-col gap-4">
          {summary && (
            <SportDistributionCard
              distribution={summary.distribution}
              totalSrpe={summary.load.currentSrpe}
            />
          )}

          <MuscleFatigueTelemetry compact />

          {loadData && (
            <Card className="p-4 border-[#1F2937] bg-[#0D1C2D] rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-[#5CA9E6]" />
                  <h2 className="font-mono text-[10px] font-bold text-[#C5C8B4] uppercase tracking-widest">
                    Carga Semanal (sRPE-TL)
                  </h2>
                </div>
                <span className="font-mono text-[10px] text-[#8F9380]">
                  Média 4 sem: <strong className="text-[#D4E4FA]">{loadData.baseline.fourWeekAvg} AU</strong>
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {loadData.weekly.slice(-6).map((week) => {
                  const maxSrpe = Math.max(...loadData.weekly.map((w) => w.totalSrpe), 1);
                  const widthPct = Math.round((week.totalSrpe / maxSrpe) * 100);
                  return (
                    <div key={week.weekLabel} className="flex items-center gap-2.5">
                      <span className="font-mono text-[10px] text-[#8F9380] w-10 shrink-0">
                        {week.weekLabel}
                      </span>
                      <div className="flex-1 h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#5CA9E6] rounded-full transition-all"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-[#D4E4FA] w-16 text-right shrink-0">
                        {week.totalSrpe} AU
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Indicadores rápidos: Sequência e Peso Corporal */}
          {(data || (weightHistory && weightHistory.currentWeightKg !== null)) && (
            <div className="grid grid-cols-2 gap-3">
              {data && (
                <Card className="p-3.5 border-[#1F2937] bg-[#0D1C2D] rounded-2xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#161C24] border border-[#1F2937] flex items-center justify-center shrink-0">
                    <Zap className="h-4 w-4 text-[#D4F684]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-display text-xl font-bold text-[#D4E4FA] leading-none">
                      {data.totalActiveDaysStreak}
                    </span>
                    <span className="font-mono text-[9px] text-[#8F9380] uppercase tracking-wider mt-1 truncate">
                      Dias na sequência
                    </span>
                  </div>
                </Card>
              )}

              {weightHistory && weightHistory.currentWeightKg !== null && (
                <Card className="p-3.5 border-[#1F2937] bg-[#0D1C2D] rounded-2xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#161C24] border border-[#1F2937] flex items-center justify-center shrink-0">
                    <Scale className="h-4 w-4 text-[#5CA9E6]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-display text-xl font-bold text-[#D4E4FA] leading-none">
                        {weightHistory.currentWeightKg.toFixed(1)} kg
                      </span>
                      <span
                        className={`font-mono text-[10px] ${
                          weightHistory.deltaKg <= 0 ? 'text-[#D4F684]' : 'text-[#FFB800]'
                        }`}
                      >
                        {weightHistory.deltaKg > 0 ? '+' : ''}
                        {weightHistory.deltaKg.toFixed(1)}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] text-[#8F9380] uppercase tracking-wider mt-1 truncate">
                      Peso corporal
                    </span>
                  </div>
                </Card>
              )}
            </div>
          )}

          {!summary && !loadData && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <AlertTriangle className="h-7 w-7 text-[#8F9380]" />
              <p className="font-mono text-xs text-[#8F9380]">Dados de carga indisponíveis</p>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          ABA 2: ESPORTES
      ========================================== */}
      {activeTab === 'sports' && (
        <div className="flex flex-col gap-4">
          {sportProgressList.length > 0 ? (
            <SportProgressSummary
              sports={sportProgressList}
              onSportClick={(sportKey) => navigate(`/progress/sports/${sportKey}`)}
            />
          ) : data && data.sportsBreakdown.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.sportsBreakdown.map((sport) => (
                <Card
                  key={sport.sportKey}
                  className="p-4 border-[#1F2937] bg-[#0D1C2D] hover:border-[#5CA9E6] cursor-pointer transition-colors rounded-2xl"
                  onClick={() => navigate(`/progress/sports/${sport.sportKey}`)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-display text-base font-bold text-[#D4E4FA]">
                        {SPORT_LABELS[sport.sportKey] || sport.sportKey}
                      </span>
                      <div className="flex gap-3 mt-1 font-mono text-[10px] text-[#8F9380] uppercase">
                        <span>{sport.totalSessions} sessões</span>
                        <span>{Math.round(sport.totalDurationSeconds / 60)} min</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Activity className="h-7 w-7 text-[#8F9380]" />
              <p className="font-mono text-xs text-[#8F9380]">
                Nenhum dado de esporte disponível para o período.
              </p>
            </div>
          )}

          {data?.recentPersonalRecords && data.recentPersonalRecords.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <h2 className="font-mono text-[10px] font-bold text-[#C5C8B4] uppercase tracking-widest flex items-center gap-1.5 border-b border-[#1F2937] pb-2">
                <Trophy className="h-3.5 w-3.5 text-[#D4F684]" />
                Recordes Pessoais Recentes
              </h2>
              <div className="flex flex-col gap-2">
                {data.recentPersonalRecords.slice(0, 4).map((pr) => (
                  <div
                    key={pr.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#0D1C2D] border border-[#1F2937]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Trophy className="h-4 w-4 text-[#D4F684] shrink-0" />
                      <div className="min-w-0">
                        <p className="font-display text-sm font-bold text-[#D4E4FA] truncate">
                          {pr.metricLabel}
                        </p>
                        <p className="font-mono text-[10px] text-[#5CA9E6]">{pr.value}</p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-[#8F9380] flex items-center gap-1 shrink-0">
                      <Calendar className="h-3 w-3" />
                      {new Date(pr.achievedAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
