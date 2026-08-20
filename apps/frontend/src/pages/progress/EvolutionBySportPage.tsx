import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { ArrowLeft, TrendingUp, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../lib/api';
import type { SportProgressDTO, SportKey } from '@pacelog/shared';
import { SPORT_LABELS, formatDuration } from '../../lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const EvolutionBySportPage: React.FC = () => {
  const { sportKey } = useParams<{ sportKey: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SportProgressDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSportProgress() {
      if (!sportKey) return;
      try {
        const response = await apiClient<SportProgressDTO>(`/api/progress/sports/${sportKey}`);
        setData(response);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4F684]"></div>
      </div>
    );
  }

  if (error || !data) {
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

  const chartData = data.weeklyTrend.map(point => ({
    name: point.weekLabel,
    Carga: point.totalLoad,
    Volume: point.sportVolume || 0,
    Sessoes: point.sessionsCount,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#051424] border border-[#1F2937] p-3 rounded shadow-lg">
          <p className="font-mono text-[10px] text-[#C5C8B4] uppercase mb-2">{label}</p>
          <div className="flex flex-col gap-1">
            <p className="font-sans text-sm text-[#D4E4FA]">
              <span className="text-[#5CA9E6] font-bold">Carga Sessional:</span> {payload[0].value}
            </p>
            {payload[1] && payload[1].value > 0 && (
              <p className="font-sans text-sm text-[#D4E4FA]">
                <span className="text-[#D4F684] font-bold">Volume Acumulado:</span> {payload[1].value}
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

      {/* KPI Cards */}
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
          <span className="font-display text-2xl font-bold text-[#D4E4FA]">{data.totalSessionalLoad}</span>
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

      {/* Recharts Area */}
      <Card variant="watch" className="p-6 border-[#1F2937]">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-[#5CA9E6]" />
          <h2 className="font-display text-sm font-bold text-[#C5C8B4] uppercase tracking-wider">
            Curva de Sobrecarga (Carga vs Volume)
          </h2>
        </div>
        
        <div className="h-[300px] w-full">
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
              <Area 
                type="monotone" 
                dataKey="Carga" 
                stroke="#5CA9E6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorCarga)" 
              />
              <Area 
                type="monotone" 
                dataKey="Volume" 
                stroke="#D4F684" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorVolume)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Sport Specific Highlights */}
      {Object.keys(data.sportSpecificHighlights).length > 1 && (
        <div>
          <h2 className="font-display text-sm font-bold text-[#C5C8B4] uppercase tracking-wider mb-4 border-b border-[#1F2937] pb-2">
            Métricas de Alto Rendimento
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
