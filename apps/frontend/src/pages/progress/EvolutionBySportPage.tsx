import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { apiClient } from '../../lib/api';
import type { SportProgressDTO, SportProgressV2, SportKey } from '@pacelog/shared';
import { SPORT_LABELS, formatDuration, formatPace } from '../../lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// ==========================================
// HELPERS
// ==========================================

function formatMetricValue(value: number | null | undefined, unit: string, key: string): string {
  if (value == null) return '—';
  if (key === 'paceSecondsPerKm') return formatPace(value);
  if (key === 'averageSpeedKmh' || unit === 'km/h') return `${value.toFixed(1)} km/h`;
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'kg' && value >= 1000) return `${(value / 1000).toFixed(1)} t`;
  if (unit === 'AU') return `${value} AU`;
  return `${value} ${unit}`;
}

function directionLabel(direction: string): string {
  if (direction === 'higher_is_better') return '↑ maior é melhor';
  if (direction === 'lower_is_better') return '↓ menor é melhor';
  return '→ variação neutra';
}

// ==========================================
// PÁGINA
// ==========================================

export const EvolutionBySportPage: React.FC = () => {
  const { sportKey } = useParams<{ sportKey: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SportProgressDTO | null>(null);
  const [v2Data, setV2Data] = useState<SportProgressV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSportProgress() {
      if (!sportKey) return;
      try {
        const [legacyData, progressV2] = await Promise.all([
          apiClient<SportProgressDTO>(`/api/progress/sports/${sportKey}`).catch(() => null),
          apiClient<SportProgressV2>(`/api/progress/by-sport/${sportKey}`).catch(() => null),
        ]);
        if (legacyData) setData(legacyData);
        if (progressV2) setV2Data(progressV2);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar telemetria do esporte');
      } finally {
        setLoading(false);
      }
    }
    fetchSportProgress();
  }, [sportKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4F684]" />
      </div>
    );
  }

  if (error || (!data && !v2Data)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertTriangle className="h-10 w-10 text-[#FF6B35]" />
        <p className="font-mono text-sm text-[#8F9380] uppercase">{error || 'Dados indisponíveis'}</p>
        <button onClick={() => navigate(-1)} className="text-[#5CA9E6] font-mono text-xs hover:underline">
          Voltar
        </button>
      </div>
    );
  }

  const chartData = data?.weeklyTrend.map(point => ({
    name: point.weekLabel,
    Carga: point.totalLoad,
    Volume: point.sportVolume || 0,
    Sessoes: point.sessionsCount,
  })) ?? [];

  const comparison = v2Data?.comparison;
  const hasComparison = !!comparison && v2Data?.confidence !== 'low';
  const varPercent = comparison?.relativeChangePercent ?? 0;
  const isNeutral = v2Data?.primaryMetricDirection === 'neutral';
  const isImprovement = varPercent > 0;

  const VarIcon = isNeutral ? Minus : isImprovement ? TrendingUp : TrendingDown;
  const varColor = isNeutral ? 'text-[#D4E4FA]' : isImprovement ? 'text-[#D4F684]' : 'text-[#FF6B35]';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#051424] border border-[#1F2937] p-3 rounded shadow-lg">
          <p className="font-mono text-[10px] text-[#C5C8B4] uppercase mb-2">{label}</p>
          <div className="flex flex-col gap-1">
            <p className="font-sans text-sm text-[#D4E4FA]">
              <span className="text-[#5CA9E6] font-bold">Carga (sRPE-TL):</span> {payload[0]?.value} AU
            </p>
            {payload[1] && payload[1].value > 0 && (
              <p className="font-sans text-sm text-[#D4E4FA]">
                <span className="text-[#D4F684] font-bold">Volume:</span> {payload[1].value}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-6 font-sans max-w-4xl mx-auto w-full pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-[#1F2937] pb-4">
        <button
          onClick={() => navigate('/progress')}
          className="p-2 rounded-full hover:bg-[#161C24] text-[#8F9380] hover:text-[#D4E4FA] transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
            Evolução: {SPORT_LABELS[sportKey as SportKey] || sportKey}
          </h1>
          <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase">
            6 Semanas de Telemetria
          </p>
        </div>
      </div>

      {/* ==========================================
          SEÇÃO V2 — MÉTRICA PRINCIPAL COM CONTEXTO
          Nunca compara métricas entre esportes diferentes.
      ========================================== */}
      {v2Data && (
        <Card className="p-6 border-[#1F2937] bg-[#0D1C2D] flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest">
                Métrica principal
              </p>
              <p className="font-display text-lg font-bold text-[#D4E4FA] mt-1">
                {v2Data.primaryMetricLabel || '—'}
              </p>
              {v2Data.primaryMetricDirection && (
                <p className="font-mono text-[10px] text-[#4A5568] mt-0.5">
                  {directionLabel(v2Data.primaryMetricDirection)}
                </p>
              )}
            </div>
            <span className="font-mono text-[10px] text-[#8F9380] border border-[#1F2937] rounded-full px-2 py-0.5">
              {v2Data.sessionsCount} sessões
            </span>
          </div>

          {/* Valor atual */}
          {comparison?.currentValue != null && (
            <div className="flex items-end gap-2">
              <span className="font-display text-4xl font-bold text-[#D4E4FA]">
                {formatMetricValue(comparison.currentValue, v2Data.primaryMetricUnit, v2Data.primaryMetricKey)}
              </span>
            </div>
          )}

          {/* Variação vs baseline */}
          {hasComparison && comparison && (
            <div className="flex items-center gap-3">
              <VarIcon className={`h-4 w-4 ${varColor}`} />
              <span className={`font-mono text-base font-bold ${varColor}`}>
                {varPercent > 0 ? '+' : ''}{varPercent.toFixed(1)}%
              </span>
              <span className="font-mono text-xs text-[#8F9380]">
                vs período anterior ({comparison.baselinePeriod.label})
              </span>
            </div>
          )}

          {/* Baseline */}
          {hasComparison && comparison && (
            <div className="flex gap-6 border-t border-[#1F2937] pt-3">
              <div>
                <p className="font-mono text-[10px] text-[#8F9380] uppercase">Atual ({comparison.currentPeriod.label})</p>
                <p className="font-mono text-sm text-[#D4E4FA]">
                  {formatMetricValue(comparison.currentValue, v2Data.primaryMetricUnit, v2Data.primaryMetricKey)}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-[#8F9380] uppercase">Baseline ({comparison.baselinePeriod.label})</p>
                <p className="font-mono text-sm text-[#D4E4FA]">
                  {formatMetricValue(comparison.baselineValue, v2Data.primaryMetricUnit, v2Data.primaryMetricKey)}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-[#8F9380] uppercase">Confiança</p>
                <p className="font-mono text-sm text-[#D4E4FA] capitalize">{comparison.confidence}</p>
              </div>
            </div>
          )}

          {/* Dados insuficientes */}
          {v2Data.confidence === 'low' && (
            <div className="flex items-center gap-2 text-[#8F9380] border-t border-[#1F2937] pt-3">
              <AlertCircle className="h-4 w-4" />
              <span className="font-mono text-xs">Dados insuficientes para gerar comparação confiável.</span>
            </div>
          )}

          {/* Nota para musculação */}
          {sportKey === 'strength' && hasComparison && varPercent > 0 && (
            <div className="flex items-start gap-2 bg-[#1F2937]/50 p-3 rounded-lg">
              <Info className="h-3.5 w-3.5 text-[#8F9380] mt-0.5 flex-shrink-0" />
              <p className="font-mono text-[10px] text-[#8F9380]">
                Aumento de volume não implica automaticamente melhora de força. Observe RPE e progressão por exercício.
              </p>
            </div>
          )}

          {/* Nota para jiu-jitsu */}
          {sportKey === 'jiujitsu' && hasComparison && (
            <div className="flex items-start gap-2 bg-[#1F2937]/50 p-3 rounded-lg">
              <Info className="h-3.5 w-3.5 text-[#8F9380] mt-0.5 flex-shrink-0" />
              <p className="font-mono text-[10px] text-[#8F9380]">
                Volume de rolas e consistência no tatame são os sinais principais de progresso. Submissões sofridas fazem parte do aprendizado.
              </p>
            </div>
          )}

          {/* Evidências */}
          {v2Data.evidence.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-[#1F2937] pt-3">
              {v2Data.evidence.map((e, i) => (
                <p key={i} className="font-mono text-[10px] text-[#8F9380] flex items-start gap-2">
                  <span className="text-[#4A5568]">→</span>
                  {e}
                </p>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* KPI Cards legados */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border-[#1F2937] flex flex-col gap-1 bg-[#0D1C2D]">
            <span className="font-mono text-[9px] text-[#8F9380] uppercase tracking-widest">Sessões Totais</span>
            <span className="font-display text-2xl font-bold text-[#D4E4FA]">{data.totalSessions}</span>
          </Card>
          <Card className="p-4 border-[#1F2937] flex flex-col gap-1 bg-[#0D1C2D]">
            <span className="font-mono text-[9px] text-[#8F9380] uppercase tracking-widest">Tempo Total</span>
            <span className="font-display text-2xl font-bold text-[#D4E4FA]">{formatDuration(data.totalDurationSeconds)}</span>
          </Card>
          <Card className="p-4 border-[#1F2937] flex flex-col gap-1 bg-[#0D1C2D]">
            <span className="font-mono text-[9px] text-[#8F9380] uppercase tracking-widest">Carga Total (6 sem)</span>
            <span className="font-display text-2xl font-bold text-[#D4E4FA]">{data.totalSessionalLoad} AU</span>
          </Card>
          {Object.entries(data.sportSpecificHighlights).slice(0, 1).map(([key, value]) => (
            <Card key={key} className="p-4 border-[#1F2937] flex flex-col gap-1 bg-[#0D1C2D]">
              <span className="font-mono text-[9px] text-[#8F9380] uppercase tracking-widest">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <span className="font-display text-2xl font-bold text-[#D4E4FA]">{value as React.ReactNode}</span>
            </Card>
          ))}
        </div>
      )}

      {/* Gráfico de Carga */}
      {chartData.length > 0 && (
        <Card className="p-6 border-[#1F2937]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-[#5CA9E6]" />
            <h2 className="font-display text-sm font-bold text-[#C5C8B4] uppercase tracking-wider">
              Carga sRPE-TL vs Volume
            </h2>
          </div>
          <p className="font-mono text-[10px] text-[#4A5568] mb-4">
            Carga em AU (Unidades Arbitrárias) · Volume em {
              sportKey === 'running' || sportKey === 'cycling' ? 'km' : sportKey === 'strength' ? 'kg' : sportKey === 'jiujitsu' ? 'rolas' : sportKey === 'boxing' ? 'rounds' : 'unidade'
            }
          </p>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCarga" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5CA9E6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#5CA9E6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4F684" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4F684" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#8F9380" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#8F9380" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Carga" stroke="#5CA9E6" strokeWidth={3} fillOpacity={1} fill="url(#colorCarga)" />
                <Area type="monotone" dataKey="Volume" stroke="#D4F684" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className="font-mono text-[9px] text-[#4A5568] mt-3">
            Carga e volume são métricas de esportes diferentes — nunca somadas entre modalidades.
          </p>
        </Card>
      )}

      {/* Destaques específicos */}
      {data && Object.keys(data.sportSpecificHighlights).length > 1 && (
        <div>
          <h2 className="font-display text-sm font-bold text-[#C5C8B4] uppercase tracking-wider mb-4 border-b border-[#1F2937] pb-2">
            Métricas Específicas
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(data.sportSpecificHighlights).slice(1).map(([key, value]) => (
              <Card key={key} className="p-4 border-[#1F2937] flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#8F9380] uppercase">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="font-display text-lg font-bold text-[#D4F684]">{value as React.ReactNode}</span>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
