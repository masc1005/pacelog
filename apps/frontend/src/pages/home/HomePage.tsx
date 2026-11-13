import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { AICoachWidget } from '../../components/ui/AICoachWidget';
import { LoadSummaryCard } from '../../components/progress/LoadSummaryCard';
import { GoalHighlightCard } from '../../components/goals/GoalHighlightCard';
import { WeeklyScheduleCard } from '../../components/schedule/WeeklyScheduleCard';
import { DailyReadinessCard } from '../../components/readiness/DailyReadinessCard';
import { gearApi } from '../../services/gear.api';
import { ArrowRight, Calendar } from 'lucide-react';
import {
  type SessionSummaryDTO,
  type ProgressSummaryDTO,
  type ProgressBySportDTO,
  type Gear,
} from '@pacelog/shared';
import { formatDuration } from '../../lib/utils';
import { apiClient } from '../../lib/api';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<SessionSummaryDTO | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progressSummary, setProgressSummary] = useState<ProgressSummaryDTO | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [isWeekLoading, setIsWeekLoading] = useState<boolean>(false);
  const [gearList, setGearList] = useState<Gear[]>([]);

  const loadWeekProgress = async (offset: number) => {
    setIsWeekLoading(true);
    try {
      const progressData = await apiClient<ProgressSummaryDTO>(`/api/progress/summary?weekOffset=${offset}`).catch(() => null);
      if (progressData) {
        setProgressSummary(progressData);
      }
    } finally {
      setIsWeekLoading(false);
    }
  };

  const handlePrevWeek = () => {
    const newOffset = weekOffset - 1;
    setWeekOffset(newOffset);
    loadWeekProgress(newOffset);
  };

  const handleNextWeek = () => {
    if (weekOffset >= 0) return;
    const newOffset = weekOffset + 1;
    setWeekOffset(newOffset);
    loadWeekProgress(newOffset);
  };

  const handleResetWeek = () => {
    setWeekOffset(0);
    loadWeekProgress(0);
  };

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
        if (gearData) setGearList(gearData);
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

  void gearList;
  void handlePrevWeek;
  void handleNextWeek;
  void handleResetWeek;
  void isWeekLoading;

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
    <div className="flex flex-col gap-4 sm:gap-5 font-sans text-[#D4E4FA] relative pb-8">
      {/* Athlete Status Sub-header */}
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-2 -mb-2">
        <span className="font-mono text-[11px] text-[#C5C8B4] uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#D4F684] rounded-full" />
          ATLETA // {user?.name || 'SESSÃO PRINCIPAL'}
        </span>
        <Link
          to="/schedule"
          className="font-mono text-[10px] text-[#D4F684] hover:underline uppercase flex items-center gap-1"
        >
          <Calendar className="w-3 h-3" /> Agenda
        </Link>
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
                {summary?.totalSessions ?? '--'}
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
      <AICoachWidget compact />

      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-baseline">
          <h2 className="font-mono text-xs font-bold text-[#D4E4FA] uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#D4F684] rounded-full" />
            ÚLTIMA SESSÃO
          </h2>
          <Link to="/sessions" className="font-mono text-[10px] uppercase text-[#D4F684] hover:underline">
            Ver todos <ArrowRight className="inline h-3 w-3" />
          </Link>
        </div>

        {sessions[0] ? (
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-[#0D1C2D] border border-[#1F2937] rounded-[2px] p-3">
              <span className="font-mono text-[9px] text-[#8F9380] uppercase">Modalidade</span>
              <span className="font-display text-sm font-bold text-[#D4E4FA] uppercase block mt-1 truncate">{sessions[0].sportKey}</span>
            </div>
            <div className="bg-[#0D1C2D] border border-[#1F2937] rounded-[2px] p-3">
              <span className="font-mono text-[9px] text-[#8F9380] uppercase">Duração</span>
              <span className="font-display text-sm font-bold text-[#D4E4FA] block mt-1">{formatDuration(sessions[0].durationSeconds)}</span>
            </div>
            <div className="bg-[#0D1C2D] border border-[#1F2937] rounded-[2px] p-3">
              <span className="font-mono text-[9px] text-[#8F9380] uppercase">RPE</span>
              <span className="font-display text-sm font-bold text-[#FF6B35] block mt-1">{sessions[0].rpe || '--'}/10</span>
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
    </div>
  );
};
