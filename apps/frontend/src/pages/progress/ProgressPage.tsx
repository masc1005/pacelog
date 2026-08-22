import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { TrendingUp, Activity, Calendar, Trophy, Zap, AlertTriangle, BarChart2, Target } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { apiClient } from '../../lib/api';
import type { ProgressOverviewDTO, ProgressSummaryDTO, ProgressLoadDTO, ProgressComparisonDTO } from '@pacelog/shared';
import { SPORT_LABELS } from '../../lib/utils';
import { LoadSummaryCard } from '../../components/progress/LoadSummaryCard';
import { SportDistributionCard } from '../../components/progress/SportDistributionCard';

// ==========================================
// ABAS DA PÁGINA
// ==========================================

type Tab = 'progress' | 'overview' | 'load' | 'consistency' | 'records';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'progress', label: 'Evolução', icon: TrendingUp },
  { key: 'overview', label: 'Visão geral', icon: Activity },
  { key: 'load', label: 'Carga', icon: BarChart2 },
  { key: 'consistency', label: 'Consistência', icon: Target },
  { key: 'records', label: 'Marcas', icon: Trophy },
];

// ==========================================
// PÁGINA
// ==========================================

export const ProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('progress');
  const [data, setData] = useState<ProgressOverviewDTO | null>(null);
  const [summary, setSummary] = useState<ProgressSummaryDTO | null>(null);
  const [loadData, setLoadData] = useState<ProgressLoadDTO | null>(null);
  const [comparison, setComparison] = useState<ProgressComparisonDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [overviewData, summaryData, loadTimeline, compData] = await Promise.all([
          apiClient<ProgressOverviewDTO>('/api/progress/overview').catch(() => null),
          apiClient<ProgressSummaryDTO>('/api/progress/summary').catch(() => null),
          apiClient<ProgressLoadDTO>('/api/progress/load').catch(() => null),
          apiClient<ProgressComparisonDTO>('/api/progress/comparison?period=30').catch(() => null),
        ]);
        if (overviewData) setData(overviewData);
        if (summaryData) setSummary(summaryData);
        if (loadTimeline) setLoadData(loadTimeline);
        if (compData) setComparison(compData);
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

  return (
    <div className="flex flex-col gap-6 font-sans max-w-4xl mx-auto w-full pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
            Evolução & Telemetria
          </h1>
          <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase">
            Progresso contextualizado
          </p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-[#D4F684] text-[#051424]'
                  : 'bg-[#0D1C2D] text-[#8F9380] hover:text-[#D4E4FA] border border-[#1F2937]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ==========================================
          ABA: EVOLUÇÃO
      ========================================== */}
      {activeTab === 'progress' && (
        <div className="flex flex-col gap-6">
          {!comparison && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <AlertTriangle className="h-8 w-8 text-[#8F9380]" />
              <p className="font-mono text-xs text-[#8F9380]">Dados de evolução indisponíveis</p>
            </div>
          )}

          {comparison && comparison.sports.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Activity className="h-8 w-8 text-[#8F9380]" />
              <p className="font-mono text-xs text-[#8F9380]">Continue registrando treinos para ver sua evolução.</p>
            </div>
          )}

          {comparison && comparison.sports.map(sport => (
            <Card key={sport.sportKey} className="flex flex-col gap-4 p-5 border-[#1F2937]">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-[#D4E4FA] uppercase">{sport.sportLabel}</h3>
                  <Badge variant={sport.primaryMetric.status === 'improved' ? 'sage' : sport.primaryMetric.status === 'declined' ? 'crimson' : 'cyan'} size="sm">
                    {sport.primaryMetric.status === 'improved' ? 'Evolução' : sport.primaryMetric.status === 'declined' ? 'Queda' : 'Estável'}
                  </Badge>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[10px] text-[#8F9380] uppercase block">Confiança</span>
                  <span className="font-mono text-xs font-bold text-[#5CA9E6] capitalize">{sport.confidence}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {sport.evidence.map((ev, i) => (
                  <p key={i} className="font-mono text-sm text-[#C5C8B4] flex gap-2">
                    <span className="text-[#5CA9E6]">→</span> {ev}
                  </p>
                ))}
                {sport.evidence.length === 0 && (
                  <p className="font-mono text-sm text-[#8F9380]">Dados suficientes para gerar estatísticas, mas nenhuma evidência destacável no momento.</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ==========================================
          ABA: VISÃO GERAL
      ========================================== */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6">
          {/* Card de carga V2 */}
          {summary && <LoadSummaryCard load={summary.load} />}

          {/* Distribuição por esporte V2 */}
          {summary && summary.distribution.length > 0 && (
            <SportDistributionCard
              distribution={summary.distribution}
              totalSrpe={summary.load.currentSrpe}
            />
          )}

          {/* Streak */}
          {data && (
            <Card className="p-6 border-[#1F2937] flex flex-col justify-center items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#1F2937] flex items-center justify-center mb-2">
                <Zap className="h-6 w-6 text-[#D4F684]" />
              </div>
              <span className="font-display text-4xl font-bold text-[#D4E4FA]">{data.totalActiveDaysStreak}</span>
              <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest">Dias na Sequência</span>
            </Card>
          )}

          {/* Progresso por esporte — navega para detalhe */}
          {data && data.sportsBreakdown.length > 0 && (
            <div>
              <h2 className="font-display text-sm font-bold text-[#C5C8B4] uppercase tracking-wider mb-4 border-b border-[#1F2937] pb-2">
                Volume por Modalidade (7 Dias)
              </h2>
              <div className="flex flex-col gap-3">
                {data.sportsBreakdown.map((sport) => (
                  <Card
                    key={sport.sportKey}
                    className="p-4 border-[#1F2937] hover:border-[#5CA9E6] cursor-pointer transition-colors"
                    onClick={() => navigate(`/progress/${sport.sportKey}`)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-display text-lg font-bold text-[#D4E4FA]">
                          {SPORT_LABELS[sport.sportKey] || sport.sportKey}
                        </span>
                        <div className="flex gap-3 mt-1">
                          <span className="font-mono text-[10px] text-[#8F9380] uppercase">{sport.totalSessions} Sessões</span>
                          <span className="font-mono text-[10px] text-[#8F9380] uppercase">{Math.round(sport.totalDurationSeconds / 60)} min</span>
                        </div>
                      </div>
                      <TrendingUp className="h-4 w-4 text-[#5CA9E6]" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          ABA: CARGA
      ========================================== */}
      {activeTab === 'load' && (
        <div className="flex flex-col gap-6">
          {summary && <LoadSummaryCard load={summary.load} />}

          {loadData && (
            <Card className="p-6 border-[#1F2937]">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="h-5 w-5 text-[#5CA9E6]" />
                <h2 className="font-display text-sm font-bold text-[#C5C8B4] uppercase tracking-wider">
                  Carga Semanal (sRPE-TL)
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {loadData.weekly.slice(-6).map((week) => {
                  const maxSrpe = Math.max(...loadData.weekly.map(w => w.totalSrpe), 1);
                  const widthPct = Math.round((week.totalSrpe / maxSrpe) * 100);
                  return (
                    <div key={week.weekLabel} className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-[#8F9380] w-10 flex-shrink-0">{week.weekLabel}</span>
                      <div className="flex-1 h-2 bg-[#1F2937] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#5CA9E6] rounded-full transition-all"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-[#D4E4FA] w-16 text-right">{week.totalSrpe} AU</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-[#1F2937] flex justify-between">
                <div>
                  <p className="font-mono text-[10px] text-[#8F9380] uppercase">Média 4 semanas</p>
                  <p className="font-mono text-lg text-[#D4E4FA]">{loadData.baseline.fourWeekAvg} AU</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] text-[#8F9380] uppercase">Confiança</p>
                  <p className="font-mono text-lg text-[#D4E4FA] capitalize">{loadData.confidence}</p>
                </div>
              </div>
            </Card>
          )}

          {!loadData && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <AlertTriangle className="h-8 w-8 text-[#8F9380]" />
              <p className="font-mono text-xs text-[#8F9380]">Dados de carga indisponíveis</p>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          ABA: CONSISTÊNCIA
      ========================================== */}
      {activeTab === 'consistency' && data && (
        <div className="flex flex-col gap-4">
          <Card className="p-6 border-[#1F2937] flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[#D4F684]" />
              <h2 className="font-display text-sm font-bold text-[#C5C8B4] uppercase tracking-wider">
                Consistência de Treino
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-[#8F9380] uppercase">Dias ativos (sequência)</span>
                <span className="font-display text-3xl font-bold text-[#D4E4FA]">{data.totalActiveDaysStreak}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-[#8F9380] uppercase">Sessões (7 dias)</span>
                <span className="font-display text-3xl font-bold text-[#D4E4FA]">{data.weeklySessionsCount}</span>
              </div>
            </div>
            <p className="font-mono text-[10px] text-[#4A5568]">
              A consistência é comparada com o histórico do próprio atleta — não com um alvo externo.
            </p>
          </Card>
        </div>
      )}

      {/* ==========================================
          ABA: MARCAS (PRs)
      ========================================== */}
      {activeTab === 'records' && (
        <div>
          <h2 className="font-display text-sm font-bold text-[#C5C8B4] uppercase tracking-wider mb-4 border-b border-[#1F2937] pb-2">
            Recordes Pessoais
          </h2>
          {data?.recentPersonalRecords && data.recentPersonalRecords.length === 0 ? (
            <p className="font-mono text-xs text-[#8F9380]">Nenhum recorde registrado ainda.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data?.recentPersonalRecords.map((pr) => (
                <div key={pr.id} className="flex gap-4 items-start p-3 rounded bg-[#161C24] border border-[#1F2937]">
                  <div className="bg-[#D4F684]/10 p-2 rounded">
                    <Trophy className="h-4 w-4 text-[#D4F684]" />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-bold text-[#D4E4FA]">{pr.metricLabel}</h4>
                    <p className="font-mono text-xs text-[#5CA9E6]">{pr.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3 text-[#8F9380]" />
                      <span className="font-mono text-[9px] text-[#8F9380] uppercase">
                        {new Date(pr.achievedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
