import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Card } from '../../components/ui/Card';
import { AIProgressInsight } from '../../components/ui/AIProgressInsight';
import { GearUsageSummary } from '../../components/gear/GearUsageSummary';
import { LoadSummaryCard } from '../../components/progress/LoadSummaryCard';
import { GoalHighlightCard } from '../../components/goals/GoalHighlightCard';
import { WeeklyScheduleCard } from '../../components/schedule/WeeklyScheduleCard';
import { DailyReadinessCard } from '../../components/readiness/DailyReadinessCard';
import { ArrowRight, Calendar, Wrench } from 'lucide-react';
import {
  type SessionSummaryDTO,
  type ProgressSummaryDTO,
  type Gear,
} from '@pacelog/shared';
import { formatDuration, SPORT_LABELS } from '../../lib/utils';
import { apiClient } from '../../lib/api';
import { gearApi } from '../../services/gear.api';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { userSports } = useSettings();
  const [summary, setSummary] = useState<SessionSummaryDTO | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progressSummary, setProgressSummary] = useState<ProgressSummaryDTO | null>(null);
  const [gearList, setGearList] = useState<Gear[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [summaryData, sessionsData, progressData, gearData] = await Promise.all([
          apiClient<SessionSummaryDTO>('/api/sessions/summary?timeframe=week').catch(() => null),
          apiClient<any[]>('/api/sessions?limit=20').catch(() => []),
          apiClient<ProgressSummaryDTO>('/api/progress/summary?weekOffset=0').catch(() => null),
          gearApi.getGear(false).catch(() => []),
        ]);

        if (summaryData) setSummary(summaryData);
        if (sessionsData && Array.isArray(sessionsData)) setSessions(sessionsData);
        if (progressData) setProgressSummary(progressData);
        if (gearData && Array.isArray(gearData)) setGearList(gearData);
      } catch {
        // Silencioso em caso de inicialização offline
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 p-4 animate-pulse">
        <div className="h-4 bg-[#1F2937] w-1/4 rounded" />
        <div className="h-32 bg-[#051424] rounded border border-[#1F2937]" />
        <div className="h-32 bg-[#0D1C2D] rounded border border-[#1F2937]" />
      </div>
    );
  }

  const latestSession = sessions[0];
  const latestSportDisplayName = latestSession
    ? userSports.find((s) => s.sportKey === latestSession.sportKey)?.displayName ||
      SPORT_LABELS[latestSession.sportKey] ||
      latestSession.sportKey
    : '';

  return (
    <div className="flex flex-col gap-4 sm:gap-5 font-sans text-[#D4E4FA] relative pb-8">
      {/* Athlete Status Sub-header */}
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-2 -mb-2">
        <span className="font-mono text-[11px] text-[#C5C8B4] uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#D4F684] rounded-full" />
          ATLETA // {user?.name || 'SESSÃO PRINCIPAL'}
        </span>
        <div className="flex items-center gap-3">
          <Link
            to="/gear"
            className="font-mono text-[10px] text-[#5CA9E6] hover:underline uppercase flex items-center gap-1"
          >
            <Wrench className="w-3 h-3" /> Equipamentos
          </Link>
          <Link
            to="/schedule"
            className="font-mono text-[10px] text-[#D4F684] hover:underline uppercase flex items-center gap-1"
          >
            <Calendar className="w-3 h-3" /> Agenda
          </Link>
        </div>
      </div>

      {/* Prontidão e treino de hoje: decisões primárias da Home */}
      <DailyReadinessCard compact />
      <WeeklyScheduleCard recentSessions={sessions} compact />

      {progressSummary && (
        <section className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          <LoadSummaryCard load={progressSummary.load} compact />
          <GoalHighlightCard compact />
          <div className="col-span-2 lg:col-span-1 bg-[#0D1C2D] border border-[#1F2937] rounded-2xl p-3 flex flex-col justify-between gap-2">
            <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest">
              Semana
            </span>
            <div className="flex items-end justify-between gap-2">
              <span className="font-display text-2xl font-bold text-[#D4E4FA]">
                {progressSummary.sessions?.current ?? summary?.totalSessions ?? '--'}
              </span>
              <span className="font-mono text-[10px] text-[#8F9380]">
                sessões
              </span>
            </div>
            <Link to="/progress" className="font-mono text-[10px] uppercase text-[#5CA9E6] hover:underline">
              Ver progresso <ArrowRight className="inline h-3 w-3" />
            </Link>
          </div>
        </section>
      )}

      {/* Insights de IA completos na tela principal + Resumo de Equipamentos */}
      <AIProgressInsight defaultExpanded showHistoryLink />
      <GearUsageSummary gearList={gearList} />

      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-baseline">
          <h2 className="font-mono text-xs font-bold text-[#D4E4FA] uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#D4F684] rounded-full" />
            ÚLTIMA SESSÃO
          </h2>
          <Link to="/sessions" className="font-mono text-[10px] uppercase text-[#D4F684] hover:underline">
            VER TODAS <ArrowRight className="inline h-3 w-3" />
          </Link>
        </div>

        {latestSession ? (
          <Link to={`/sessions/${latestSession.id}`}>
            <Card className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-[#D4F684] transition-colors">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-[#8F9380] uppercase">
                  {new Date(latestSession.startedAt).toLocaleDateString('pt-BR')} // {latestSportDisplayName}
                </span>
                <span className="font-display text-lg font-bold text-[#D4E4FA]">
                  {formatDuration(latestSession.durationSeconds)} | RPE {latestSession.rpe}/10
                </span>
              </div>
              <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-[#1F2937] pt-3 sm:pt-0 sm:pl-6 w-full sm:w-auto">
                <div>
                  <span className="font-mono text-[9px] text-[#8F9380] block uppercase">CARGA (TRIMP)</span>
                  <span className="font-mono text-xl font-bold text-[#5CA9E6]">
                    {latestSession.sessionalLoad} <small className="text-xs">AU</small>
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ) : (
          <Card className="p-6 text-center text-[#8F9380] font-mono text-xs uppercase">
            NENHUMA SESSÃO REGISTRADA AINDA.
          </Card>
        )}
      </section>
    </div>
  );
};
