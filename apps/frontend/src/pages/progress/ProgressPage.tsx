import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { TrendingUp, Activity, Calendar, Trophy, Zap, AlertTriangle } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { apiClient } from '../../lib/api';
import type { ProgressOverviewDTO } from '@pacelog/shared';
import { SPORT_LABELS } from '../../lib/utils';

export const ProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ProgressOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOverview() {
      try {
        const response = await apiClient<ProgressOverviewDTO>('/api/progress/overview');
        setData(response);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar telemetria');
      } finally {
        setLoading(false);
      }
    }
    fetchOverview();
  }, []);

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
      </div>
    );
  }

  const { acwr, totalActiveDaysStreak, sportsBreakdown, recentPersonalRecords } = data;

  const acwrColors = {
    'under-training': 'text-[#5CA9E6]',
    'optimal': 'text-[#D4F684]',
    'over-reaching': 'text-[#F59E0B]',
    'danger_zone': 'text-[#FF6B35]',
  };

  const acwrColor = acwrColors[acwr.status] || 'text-[#D4F684]';

  return (
    <div className="flex flex-col gap-6 font-sans max-w-4xl mx-auto w-full pb-20">
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
            Evolução & Telemetria
          </h1>
          <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase">
            Visão Geral de Carga
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ACWR Card */}
        <Card variant="watch" className="p-6 md:col-span-2 bg-[#0D1C2D] border-[#1F2937] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Activity className={`h-5 w-5 ${acwrColor}`} />
                <span className="font-mono text-[10px] text-[#C5C8B4] uppercase tracking-widest">Motor ACWR (Carga Crônica)</span>
              </div>
              <Badge variant="sage" className="bg-[#1F2937]">{acwr.ratio.toFixed(2)}x</Badge>
            </div>
            
            <div className="flex flex-col gap-2">
              <span className={`font-display text-4xl font-bold ${acwrColor}`}>
                {acwr.status.replace('-', ' ').replace('_', ' ').toUpperCase()}
              </span>
              <p className="font-sans text-sm text-[#8F9380]">{acwr.message}</p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-between items-end">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] text-[#8F9380] uppercase">Carga Aguda (7d)</span>
              <span className="font-mono text-lg text-[#D4E4FA]">{acwr.acuteLoad}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="font-mono text-[10px] text-[#8F9380] uppercase">Carga Crônica (28d)</span>
              <span className="font-mono text-lg text-[#D4E4FA]">{acwr.chronicLoad}</span>
            </div>
          </div>
        </Card>

        {/* Streak Card */}
        <Card className="p-6 border-[#1F2937] flex flex-col justify-center items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#1F2937] flex items-center justify-center mb-2">
            <Zap className="h-6 w-6 text-[#D4F684]" />
          </div>
          <span className="font-display text-4xl font-bold text-[#D4E4FA]">{totalActiveDaysStreak}</span>
          <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest">Dias na Sequência</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        {/* Distribuição por Esportes */}
        <div>
          <h2 className="font-display text-sm font-bold text-[#C5C8B4] uppercase tracking-wider mb-4 border-b border-[#1F2937] pb-2">
            Volume por Modalidade (7 Dias)
          </h2>
          {sportsBreakdown.length === 0 ? (
            <p className="font-mono text-xs text-[#8F9380]">Nenhum esporte registrado nos últimos 7 dias.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sportsBreakdown.map((sport) => (
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
          )}
        </div>

        {/* Recordes Pessoais Recentes */}
        <div>
          <h2 className="font-display text-sm font-bold text-[#C5C8B4] uppercase tracking-wider mb-4 border-b border-[#1F2937] pb-2">
            Recordes Recentes (PRs)
          </h2>
          {recentPersonalRecords.length === 0 ? (
            <p className="font-mono text-xs text-[#8F9380]">Nenhum recorde registrado ainda.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentPersonalRecords.map((pr) => (
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
      </div>
    </div>
  );
};
