import { SessionModel } from '../sessions/session.model.js';
import type {
  SportKey,
  ProgressOverviewDTO,
  SportProgressDTO,
  PersonalRecordItem,
  AcwrReadout,
  AcwrStatus,
  WeeklyTrendPoint,
  SportSummaryStats,
} from '@pacelog/shared';

export class ProgressService {
  /**
   * Visão Geral da Telemetria com cálculo fisiológico de ACWR (Acute:Chronic Workload Ratio),
   * sequência de consistência e resumo da semana.
   */
  async getOverview(userId: string): Promise<ProgressOverviewDTO> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    // 1. Buscar sessões dos últimos 28 dias para cálculo de ACWR
    const sessionsLast28d = await SessionModel.find({
      userId,
      startedAt: { $gte: twentyEightDaysAgo },
    })
      .sort({ startedAt: -1 })
      .exec();

    let acuteLoad = 0;
    let chronicSum = 0;
    let weeklyTotalDurationSeconds = 0;
    let weeklySessionsCount = 0;

    for (const session of sessionsLast28d) {
      const load = Number(session.sessionalLoad) || 0;
      const duration = Number(session.durationSeconds) || 0;
      const sessionDate = new Date(session.startedAt);

      chronicSum += load;

      if (sessionDate >= sevenDaysAgo) {
        acuteLoad += load;
        weeklyTotalDurationSeconds += duration;
        weeklySessionsCount += 1;
      }
    }

    // Chronic Load = Média semanal dos últimos 28 dias
    const chronicLoad = Math.max(1, Math.round(chronicSum / 4));
    const ratio = Math.round((acuteLoad / chronicLoad) * 100) / 100;

    let acwrStatus: AcwrStatus = 'optimal';
    let acwrMessage = 'Zona Ótima (Sweet Spot). Evolução consistente com baixo risco de lesão.';

    if (ratio < 0.8) {
      acwrStatus = 'under-training';
      acwrMessage = 'Carga reduzida. Há margem fisiológica para aumento de volume/intensidade.';
    } else if (ratio > 1.5) {
      acwrStatus = 'danger_zone';
      acwrMessage = 'Alerta de pico agudo de esforço! Risco aumentado de sobrecarga/lesão.';
    } else if (ratio > 1.3) {
      acwrStatus = 'over-reaching';
      acwrMessage = 'Sobrecarga funcional detectada. Monitore o tempo de descanso.';
    }

    const acwr: AcwrReadout = {
      acuteLoad,
      chronicLoad,
      ratio,
      status: acwrStatus,
      message: acwrMessage,
    };

    // 2. Sequência de dias ativos (Streak)
    const uniqueDaysAgg = await SessionModel.aggregate([
      { $match: { userId } },
      {
        $project: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$startedAt' } },
        },
      },
      { $group: { _id: '$day' } },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ]);
    const totalActiveDaysStreak = uniqueDaysAgg.length;

    // 3. Distribuição por esporte nos últimos 7 dias
    const sportsAgg = await SessionModel.aggregate([
      { $match: { userId, startedAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: '$sportKey',
          totalSessions: { $sum: 1 },
          totalDurationSeconds: { $sum: '$durationSeconds' },
          totalSessionalLoad: { $sum: '$sessionalLoad' },
        },
      },
    ]);

    const sportsBreakdown: SportSummaryStats[] = sportsAgg.map((item) => ({
      sportKey: item._id as SportKey,
      totalSessions: item.totalSessions,
      totalDurationSeconds: item.totalDurationSeconds,
      totalSessionalLoad: item.totalSessionalLoad,
    }));

    // 4. Recordes Pessoais Recentes
    const recentPersonalRecords = await this.getPersonalRecords(userId);

    return {
      acwr,
      totalActiveDaysStreak,
      weeklyTotalDurationSeconds,
      weeklyTotalSessionalLoad: acuteLoad,
      weeklySessionsCount,
      sportsBreakdown,
      recentPersonalRecords: recentPersonalRecords.slice(0, 4),
    };
  }

  /**
   * Evolução e séries temporais de um esporte específico (para alimentar gráficos de tendência).
   */
  async getSportProgress(
    userId: string,
    sportKey: SportKey,
    weeksCount = 6
  ): Promise<SportProgressDTO> {
    const now = new Date();
    const startDate = new Date(now.getTime() - weeksCount * 7 * 24 * 60 * 60 * 1000);

    const sessions = await SessionModel.find({
      userId,
      sportKey,
      startedAt: { $gte: startDate },
    })
      .sort({ startedAt: 1 })
      .exec();

    let totalSessions = 0;
    let totalDurationSeconds = 0;
    let totalSessionalLoad = 0;

    // Agrupamento por semana
    const weeklyMap = new Map<string, { load: number; duration: number; count: number; volume: number }>();

    for (let i = 0; i < weeksCount; i++) {
      const wStart = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      const label = wStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      weeklyMap.set(label, { load: 0, duration: 0, count: 0, volume: 0 });
    }

    for (const session of sessions) {
      totalSessions += 1;
      totalDurationSeconds += session.durationSeconds || 0;
      totalSessionalLoad += session.sessionalLoad || 0;

      const sDate = new Date(session.startedAt);
      const diffWeeks = Math.floor((sDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const targetWStart = new Date(startDate.getTime() + Math.min(diffWeeks, weeksCount - 1) * 7 * 24 * 60 * 60 * 1000);
      const label = targetWStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      if (weeklyMap.has(label)) {
        const item = weeklyMap.get(label)!;
        item.load += session.sessionalLoad || 0;
        item.duration += session.durationSeconds || 0;
        item.count += 1;

        if (sportKey === 'running' && session.metrics?.distanceMeters) {
          item.volume += session.metrics.distanceMeters / 1000;
        } else if (sportKey === 'strength' && session.metrics?.totalVolumeKg) {
          item.volume += session.metrics.totalVolumeKg;
        } else if (sportKey === 'boxing' && session.metrics?.roundsCount) {
          item.volume += session.metrics.roundsCount;
        }
      }
    }

    const weeklyTrend: WeeklyTrendPoint[] = Array.from(weeklyMap.entries()).map(([label, val]) => ({
      weekLabel: label,
      startDate: label,
      totalLoad: val.load,
      totalDurationSeconds: val.duration,
      sessionsCount: val.count,
      sportVolume: Math.round(val.volume * 10) / 10,
    }));

    // Destaques específicos da modalidade
    const sportSpecificHighlights: Record<string, any> = {};
    if (sportKey === 'running') {
      const paces = sessions
        .map((s) => s.metrics?.paceSecondsPerKm)
        .filter((p): p is number => Boolean(p && p > 0));
      sportSpecificHighlights.bestPaceSecondsPerKm = paces.length > 0 ? Math.min(...paces) : null;
      sportSpecificHighlights.totalDistanceKm = Math.round(
        sessions.reduce((acc, s) => acc + (s.metrics?.distanceMeters || 0) / 1000, 0) * 10
      ) / 10;
    } else if (sportKey === 'strength') {
      const volumes = sessions
        .map((s) => s.metrics?.totalVolumeKg)
        .filter((v): v is number => Boolean(v && v > 0));
      sportSpecificHighlights.maxVolumeSingleSessionKg = volumes.length > 0 ? Math.max(...volumes) : null;
      sportSpecificHighlights.totalTonnageKg = Math.round(
        sessions.reduce((acc, s) => acc + (s.metrics?.totalVolumeKg || 0), 0)
      );
    } else if (sportKey === 'boxing') {
      sportSpecificHighlights.totalRounds = sessions.reduce(
        (acc, s) => acc + (s.metrics?.roundsCount || 0),
        0
      );
      sportSpecificHighlights.totalPunchesEstimate = sessions.reduce(
        (acc, s) => acc + (s.metrics?.punchesThrownEstimate || 0),
        0
      );
    }

    return {
      sportKey,
      totalSessions,
      totalDurationSeconds,
      totalSessionalLoad,
      weeklyTrend,
      sportSpecificHighlights,
    };
  }

  /**
   * Extração de Recordes Pessoais (PRs) do histórico de treinos do atleta.
   */
  async getPersonalRecords(userId: string): Promise<PersonalRecordItem[]> {
    const sessions = await SessionModel.find({ userId }).sort({ startedAt: -1 }).exec();

    const prs: PersonalRecordItem[] = [];

    let longestRunDistanceMeters = 0;
    let fastestRunPace = 99999;
    let maxStrengthVolumeKg = 0;
    let maxBoxingRounds = 0;
    let maxFootballGoals = 0;

    for (const session of sessions) {
      const sport = session.sportKey;

      if (sport === 'running' && session.metrics?.distanceMeters) {
        if (session.metrics.distanceMeters > longestRunDistanceMeters) {
          longestRunDistanceMeters = session.metrics.distanceMeters;
          prs.push({
            id: `pr-run-dist-${session._id}`,
            sportKey: 'running',
            metricLabel: 'Maior Distância em Corrida',
            value: `${(session.metrics.distanceMeters / 1000).toFixed(1)} km`,
            unit: 'km',
            achievedAt: session.startedAt,
            sessionId: (session._id as any).toString(),
          });
        }

        if (session.metrics.paceSecondsPerKm && session.metrics.paceSecondsPerKm < fastestRunPace && session.metrics.distanceMeters >= 3000) {
          fastestRunPace = session.metrics.paceSecondsPerKm;
          const mins = Math.floor(fastestRunPace / 60);
          const secs = fastestRunPace % 60;
          prs.push({
            id: `pr-run-pace-${session._id}`,
            sportKey: 'running',
            metricLabel: 'Melhor Ritmo (Pace)',
            value: `${mins}:${secs.toString().padStart(2, '0')} /km`,
            unit: 'min/km',
            achievedAt: session.startedAt,
            sessionId: (session._id as any).toString(),
          });
        }
      }

      if (sport === 'strength' && session.metrics?.totalVolumeKg) {
        if (session.metrics.totalVolumeKg > maxStrengthVolumeKg) {
          maxStrengthVolumeKg = session.metrics.totalVolumeKg;
          prs.push({
            id: `pr-str-vol-${session._id}`,
            sportKey: 'strength',
            metricLabel: 'Maior Volume de Carga (Tonelagem)',
            value: `${Math.round(maxStrengthVolumeKg)} kg`,
            unit: 'kg',
            achievedAt: session.startedAt,
            sessionId: (session._id as any).toString(),
          });
        }
      }

      if (sport === 'boxing' && session.metrics?.roundsCount) {
        if (session.metrics.roundsCount > maxBoxingRounds) {
          maxBoxingRounds = session.metrics.roundsCount;
          prs.push({
            id: `pr-box-rounds-${session._id}`,
            sportKey: 'boxing',
            metricLabel: 'Maior Volume de Rounds',
            value: `${maxBoxingRounds} rounds`,
            unit: 'rounds',
            achievedAt: session.startedAt,
            sessionId: (session._id as any).toString(),
          });
        }
      }

      if (sport === 'football' && session.metrics?.goals !== undefined) {
        if (session.metrics.goals > maxFootballGoals) {
          maxFootballGoals = session.metrics.goals;
          prs.push({
            id: `pr-foot-goals-${session._id}`,
            sportKey: 'football',
            metricLabel: 'Mais Gols em uma Partida',
            value: `${maxFootballGoals} gols`,
            unit: 'gols',
            achievedAt: session.startedAt,
            sessionId: (session._id as any).toString(),
          });
        }
      }
    }

    return prs;
  }
}

export const progressService = new ProgressService();
