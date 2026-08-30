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
  ProgressSummaryDTO,
  ProgressBySportDTO,
  ProgressLoadDTO,
  ProgressTimelineDTO,
  ConfidenceLevel,
  PeriodDescriptor,
} from '@pacelog/shared';
import {
  calculateWeeklySrpeLoad,
  calculateFourWeekBaseline,
  calculateSportMetricBaseline,
  compareWithBaseline,
  calculateConfidence,
  classifyLoadVariation,
  buildLoadStatusLabel,
  buildLoadStatusMessage,
  LOAD_DISCLAIMER,
} from './baseline.service.js';
import { calculateActiveStreak } from './streak.service.js';
import { computePrimaryMetric } from '../sessions/sport.rules.js';
import {
  calculateConfidence as calcComparisonConfidence,
  compareRunning,
  compareFootball,
  compareFutevolei,
  compareBoxing,
  compareStrength,
} from './comparison/index.js';
import type { ProgressComparisonDTO, SportProgress, ProgressStatus } from '@pacelog/shared';

// ==========================================
// HELPERS DE PERÍODO
// ==========================================

function buildPeriodDescriptor(key: string, startMs: number, endMs: number, label: string): PeriodDescriptor {
  return {
    key,
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    label,
  };
}

function buildSportLabel(sportKey: SportKey): string {
  const labels: Record<SportKey, string> = {
    running: 'Corrida',
    football: 'Futebol',
    futevolei: 'Futevôlei',
    boxing: 'Boxe',
    strength: 'Musculação',
    swimming: 'Natação',
  };
  return labels[sportKey] || sportKey;
}

// ==========================================
// PROGRESS SERVICE
// ==========================================

export class ProgressService {
  /**
   * GET /api/progress/comparison
   * Novo endpoint para o dashboard V2: ranking de evolução, eficiência e comparativos relativos.
   */
  async getComparison(userId: string, periodDays = 30): Promise<ProgressComparisonDTO> {
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const baselineStart = new Date(now.getTime() - periodDays * 2 * 24 * 60 * 60 * 1000);

    const [currentSessions, baselineSessions] = await Promise.all([
      SessionModel.find({
        userId,
        startedAt: { $gte: periodStart },
        status: 'completed',
      }).sort({ startedAt: 1 }).exec(),
      SessionModel.find({
        userId,
        startedAt: { $gte: baselineStart, $lt: periodStart },
        status: 'completed',
      }).sort({ startedAt: 1 }).exec(),
    ]);

    // Calcular stats de consistência (assume 1 sessão por dia como meta)
    const currentDays = new Set(currentSessions.map(s => new Date(s.startedAt).toISOString().split('T')[0])).size;
    const baselineDays = new Set(baselineSessions.map(s => new Date(s.startedAt).toISOString().split('T')[0])).size;

    const overall = {
      currentSessions: currentSessions.length,
      baselineSessions: baselineSessions.length,
      consistencyPercent: Math.round((currentDays / periodDays) * 100),
      baselineConsistencyPercent: Math.round((baselineDays / periodDays) * 100),
    };

    const sportsList: SportProgress[] = [];
    const sportKeys = Array.from(new Set([...currentSessions, ...baselineSessions].map(s => s.sportKey)));

    for (const sportKey of sportKeys) {
      const sportCurrent = currentSessions.filter(s => s.sportKey === sportKey);
      const sportBaseline = baselineSessions.filter(s => s.sportKey === sportKey);
      
      const currentSrpe = sportCurrent.reduce((acc, s) => acc + ((s as any).load?.srpe ?? s.sessionalLoad ?? 0), 0);
      const baselineSrpe = sportBaseline.reduce((acc, s) => acc + ((s as any).load?.srpe ?? s.sessionalLoad ?? 0), 0);
      
      const variationPercent = baselineSrpe > 0
        ? Math.round(((currentSrpe - baselineSrpe) / baselineSrpe) * 1000) / 10
        : null;

      const conf = calcComparisonConfidence(sportCurrent.length, periodDays);

      let compResult = { primaryMetric: null as any, secondaryMetrics: [] as any[], evidence: [] as string[] };
      
      if (sportKey === 'running') compResult = compareRunning(sportCurrent as any, sportBaseline as any);
      else if (sportKey === 'football') compResult = compareFootball(sportCurrent as any, sportBaseline as any);
      else if (sportKey === 'futevolei') compResult = compareFutevolei(sportCurrent as any, sportBaseline as any);
      else if (sportKey === 'boxing') compResult = compareBoxing(sportCurrent as any, sportBaseline as any);
      else if (sportKey === 'strength') compResult = compareStrength(sportCurrent as any, sportBaseline as any);

      if (compResult.primaryMetric) {
        sportsList.push({
          sportKey,
          sportLabel: buildSportLabel(sportKey),
          sessions: {
            current: sportCurrent.length,
            baseline: sportBaseline.length,
            variationPercent: sportBaseline.length > 0
              ? Math.round(((sportCurrent.length - sportBaseline.length) / sportBaseline.length) * 1000) / 10
              : 0,
          },
          primaryMetric: compResult.primaryMetric,
          secondaryMetrics: compResult.secondaryMetrics,
          loadContext: {
            currentSrpe,
            baselineSrpe,
            variationPercent,
          },
          evidence: compResult.evidence,
          confidence: conf,
        });
      }
    }

    // Calcular rankings
    let mostImproved: SportKey | null = null;
    let mostConsistent: SportKey | null = null;
    let mostEfficient: SportKey | null = null;
    let maxImprovement = 0;
    let maxConsistency = 0;
    let maxEfficiency = 0;

    for (const sport of sportsList) {
      if (sport.confidence === 'low') continue;
      
      // Most improved (relativo)
      if (sport.primaryMetric.direction !== 'neutral' && sport.primaryMetric.status === 'improved') {
        if (sport.primaryMetric.relativeChangePercent > maxImprovement) {
          maxImprovement = sport.primaryMetric.relativeChangePercent;
          mostImproved = sport.sportKey;
        }
      }

      // Most consistent (frequência)
      if (sport.sessions.current >= 4 && sport.sessions.current > maxConsistency) {
        maxConsistency = sport.sessions.current;
        mostConsistent = sport.sportKey;
      }

      // Most efficient (melhora com esforço semelhante ou menor)
      if (sport.primaryMetric.status === 'improved' && sport.loadContext.variationPercent !== null) {
        const efficiencyScore = sport.primaryMetric.relativeChangePercent - (sport.loadContext.variationPercent / 2);
        if (efficiencyScore > maxEfficiency) {
          maxEfficiency = efficiencyScore;
          mostEfficient = sport.sportKey;
        }
      }
    }

    const currentSrpe = currentSessions.reduce((acc, s) => acc + ((s as any).load?.srpe ?? s.sessionalLoad ?? 0), 0);
    const baselineSrpe = baselineSessions.reduce((acc, s) => acc + ((s as any).load?.srpe ?? s.sessionalLoad ?? 0), 0);
    const varTotal = baselineSrpe > 0 ? Math.round(((currentSrpe - baselineSrpe) / baselineSrpe) * 1000) / 10 : null;

    const distributionBySport = sportsList.map(s => ({
      sportKey: s.sportKey,
      srpe: s.loadContext.currentSrpe ?? 0,
      sharePercent: currentSrpe > 0 ? Math.round(((s.loadContext.currentSrpe ?? 0) / currentSrpe) * 1000) / 10 : 0,
    }));

    const overallConfidence = calcComparisonConfidence(currentSessions.length, periodDays);

    return {
      period: buildPeriodDescriptor(`last_${periodDays}_days`, periodStart.getTime(), now.getTime(), `${periodDays} dias`),
      overall,
      sports: sportsList,
      ranking: {
        mostImproved,
        mostConsistent,
        mostEfficient,
      },
      loadContext: {
        currentSrpe,
        baselineSrpe,
        variationPercent: varTotal,
        distributionBySport,
      },
      confidence: overallConfidence,
    };
  }


  /**
   * GET /api/progress/summary
   * Visão consolidada do período com carga, sessões e distribuição por esporte.
   * Linguagem descritiva — sem termos médicos.
   */
  async getSummary(userId: string, periodDays = 7): Promise<ProgressSummaryDTO> {
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const baselineStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    // Sessões do período atual e do baseline
    const [currentSessions, baselineSessions] = await Promise.all([
      SessionModel.find({
        userId,
        startedAt: { $gte: periodStart },
        status: 'completed',
      }).sort({ startedAt: 1 }).exec(),
      SessionModel.find({
        userId,
        startedAt: { $gte: baselineStart, $lt: periodStart },
        status: 'completed',
      }).sort({ startedAt: 1 }).exec(),
    ]);

    // Carga total do período atual
    const currentSrpe = currentSessions.reduce((acc, s) => {
      return acc + ((s as any).load?.srpe ?? s.sessionalLoad ?? 0);
    }, 0);

    // Baseline de 4 semanas
    const allBaseSessions = await SessionModel.find({
      userId,
      startedAt: { $gte: baselineStart },
      status: 'completed',
    }).sort({ startedAt: 1 }).exec();

    const weeklyLoads = calculateWeeklySrpeLoad(allBaseSessions as any[]);
    const baselineSrpe = calculateFourWeekBaseline(weeklyLoads) ?? 0;

    const variationPercent = baselineSrpe > 0
      ? Math.round(((currentSrpe - baselineSrpe) / Math.abs(baselineSrpe)) * 1000) / 10
      : 0;

    const confidence = calculateConfidence(
      currentSessions.length,
      Math.ceil((now.getTime() - (allBaseSessions[0]?.startedAt ?? now).getTime()) / (24 * 60 * 60 * 1000))
    );
    const status = classifyLoadVariation(variationPercent, confidence);
    const windowLabel = 'das últimas 4 semanas';

    // Distribuição por esporte
    const sportMap = new Map<SportKey, number>();
    for (const s of currentSessions) {
      const load = (s as any).load?.srpe ?? s.sessionalLoad ?? 0;
      const existing = sportMap.get(s.sportKey) ?? 0;
      sportMap.set(s.sportKey, existing + load);
    }

    const distribution = Array.from(sportMap.entries()).map(([sportKey, srpe]) => ({
      sportKey,
      sportLabel: buildSportLabel(sportKey),
      srpe,
      sharePercent: currentSrpe > 0 ? Math.round((srpe / currentSrpe) * 1000) / 10 : 0,
    }));

    const bySport = distribution.map(d => ({
      sportKey: d.sportKey,
      sportLabel: d.sportLabel,
      currentSrpe: d.srpe,
      baselineSrpe: 0, // calculado por esporte em getSportProgressV2
      variationPercent: 0,
      sharePercent: d.sharePercent,
    }));

    // Explicações determinísticas
    const explanations: string[] = [];
    if (currentSrpe > 0 && baselineSrpe > 0) {
      explanations.push(buildLoadStatusMessage(status, variationPercent, windowLabel));
    }
    if (distribution.length > 0) {
      const top = distribution.sort((a, b) => b.srpe - a.srpe)[0];
      if (top.sharePercent > 20) {
        explanations.push(`${top.sportLabel} representa ${top.sharePercent}% da carga percebida do período.`);
      }
    }
    if (currentSessions.length < 3) {
      explanations.push('Poucos dados para gerar tendências confiáveis. Continue registrando seus treinos.');
    }

    const period = buildPeriodDescriptor(
      `last_${periodDays}_days`,
      periodStart.getTime(),
      now.getTime(),
      periodDays === 7 ? '7 dias' : `${periodDays} dias`
    );

    const baselinePeriod = buildPeriodDescriptor('last_28_days', baselineStart.getTime(), now.getTime(), '4 semanas');

    return {
      period,
      load: {
        currentSrpe,
        baselineSrpe,
        variationPercent,
        unit: 'AU',
        confidence,
        status,
        statusLabel: buildLoadStatusLabel(status),
        statusMessage: buildLoadStatusMessage(status, variationPercent, windowLabel),
        disclaimer: LOAD_DISCLAIMER,
      },
      sessions: {
        current: currentSessions.length,
        baseline: baselineSessions.length,
        variationPercent: baselineSessions.length > 0
          ? Math.round(((currentSessions.length - baselineSessions.length) / baselineSessions.length) * 1000) / 10
          : 0,
      },
      bySport,
      distribution,
      explanations,
    };
  }

  /**
   * GET /api/progress/by-sport
   * Progresso por esporte com métrica principal, baseline e confiança.
   */
  async getSportProgressV2(userId: string, sportKey: SportKey): Promise<ProgressBySportDTO> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const sessions = await SessionModel.find({
      userId,
      sportKey,
      status: 'completed',
      startedAt: { $gte: sixtyDaysAgo },
    }).sort({ startedAt: 1 }).exec();

    const currentSessions = sessions.filter(s => new Date(s.startedAt) >= thirtyDaysAgo);
    const baselineSessions = sessions.filter(s => new Date(s.startedAt) < thirtyDaysAgo);

    // Carga atual e baseline
    const currentSrpe = currentSessions.reduce((acc, s) => acc + ((s as any).load?.srpe ?? s.sessionalLoad ?? 0), 0);
    const baselineSrpe = baselineSessions.reduce((acc, s) => acc + ((s as any).load?.srpe ?? s.sessionalLoad ?? 0), 0);

    const loadVariationPercent = baselineSrpe > 0
      ? Math.round(((currentSrpe - baselineSrpe) / Math.abs(baselineSrpe)) * 1000) / 10
      : 0;

    const confidence = calculateConfidence(
      currentSessions.length,
      Math.ceil((now.getTime() - thirtyDaysAgo.getTime()) / (24 * 60 * 60 * 1000))
    );

    // Métrica principal
    const lastSession = currentSessions[currentSessions.length - 1];
    const primaryMetric = lastSession
      ? computePrimaryMetric(sportKey, lastSession.metrics, lastSession.durationSeconds)
      : null;

    let comparison = null;
    if (primaryMetric && baselineSessions.length >= 3) {
      const baselineValue = calculateSportMetricBaseline(
        baselineSessions as any,
        (s: any) => {
          const m = computePrimaryMetric(sportKey, s.metrics, s.durationSeconds);
          return m?.value ?? null;
        }
      );

      if (baselineValue !== null && primaryMetric.value > 0) {
        const currentPeriod = buildPeriodDescriptor('last_30_days', thirtyDaysAgo.getTime(), now.getTime(), '30 dias');
        const baselinePeriod = buildPeriodDescriptor('previous_30_days', sixtyDaysAgo.getTime(), thirtyDaysAgo.getTime(), '30 dias anteriores');

        comparison = compareWithBaseline(
          primaryMetric.value,
          baselineValue,
          primaryMetric.direction as any,
          primaryMetric.unit,
          currentPeriod,
          baselinePeriod,
          confidence
        );
      }
    }

    // Evidências determinísticas
    const evidence: string[] = [];
    if (currentSessions.length > 0) {
      evidence.push(`${currentSessions.length} sessões nos últimos 30 dias.`);
    }
    if (comparison !== null) {
      const dir = comparison.relativeChangePercent > 0 ? 'melhora' : 'queda';
      const abs = Math.abs(comparison.relativeChangePercent).toFixed(1);
      if (primaryMetric?.direction === 'neutral') {
        evidence.push(`${primaryMetric.label}: variação de ${abs}% em relação ao período anterior.`);
      } else {
        evidence.push(`${primaryMetric?.label}: ${dir} de ${abs}% em relação ao período anterior.`);
      }
    }
    if (confidence === 'low') {
      evidence.push('Dados insuficientes para tendências confiáveis. Continue registrando.');
    }

    return {
      sportKey,
      sportLabel: buildSportLabel(sportKey),
      primaryMetricKey: primaryMetric?.key ?? '',
      primaryMetricLabel: primaryMetric?.label ?? '',
      primaryMetricUnit: primaryMetric?.unit ?? '',
      primaryMetricDirection: (primaryMetric?.direction as any) ?? 'neutral',
      comparison,
      load: {
        currentSrpe,
        baselineSrpe,
        variationPercent: loadVariationPercent,
        confidence,
      },
      evidence,
      confidence,
      sessionsCount: currentSessions.length,
    };
  }

  /**
   * GET /api/progress/load
   * Série temporal de carga semanal com baseline de 4 semanas.
   */
  async getLoadTimeline(userId: string): Promise<ProgressLoadDTO> {
    const now = new Date();
    const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);

    const sessions = await SessionModel.find({
      userId,
      status: 'completed',
      startedAt: { $gte: eightWeeksAgo },
    }).sort({ startedAt: 1 }).exec();

    const weekly = calculateWeeklySrpeLoad(sessions as any[]);
    const last4 = weekly.slice(-4);
    const current = weekly[weekly.length - 1];
    const fourWeekAvg = calculateFourWeekBaseline(last4.slice(0, -1)) ?? 0;
    const lastWeekLoad = weekly.length >= 2 ? weekly[weekly.length - 2].totalSrpe : 0;

    const confidence = calculateConfidence(sessions.length, 56);
    const variationPercent = fourWeekAvg > 0
      ? Math.round(((( current?.totalSrpe ?? 0) - fourWeekAvg) / Math.abs(fourWeekAvg)) * 1000) / 10
      : 0;
    const status = classifyLoadVariation(variationPercent, confidence);

    return {
      period: buildPeriodDescriptor('last_8_weeks', eightWeeksAgo.getTime(), now.getTime(), '8 semanas'),
      weekly: weekly.map(w => ({
        weekLabel: w.weekLabel,
        startDate: w.startDate.toISOString(),
        totalSrpe: w.totalSrpe,
        sessionsCount: w.sessionsCount,
      })),
      baseline: {
        fourWeekAvg,
        lastWeek: lastWeekLoad,
      },
      current: {
        srpe: current?.totalSrpe ?? 0,
        sessionsCount: current?.sessionsCount ?? 0,
      },
      confidence,
      status,
    };
  }

  /**
   * GET /api/progress/timeline
   * Série diária de treinos para visualização no dashboard.
   */
  async getTimeline(userId: string, periodDays = 30): Promise<ProgressTimelineDTO> {
    const now = new Date();
    const start = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const sessions = await SessionModel.find({
      userId,
      status: 'completed',
      startedAt: { $gte: start },
    }).sort({ startedAt: 1 }).exec();

    const dayMap = new Map<string, { srpe: number; count: number; sports: Set<SportKey> }>();

    for (const s of sessions) {
      const day = new Date(s.startedAt).toISOString().split('T')[0];
      if (!dayMap.has(day)) {
        dayMap.set(day, { srpe: 0, count: 0, sports: new Set() });
      }
      const d = dayMap.get(day)!;
      d.srpe += (s as any).load?.srpe ?? s.sessionalLoad ?? 0;
      d.count += 1;
      d.sports.add(s.sportKey);
    }

    const points = Array.from(dayMap.entries()).map(([date, data]) => ({
      date,
      srpe: data.srpe,
      sessionsCount: data.count,
      sportKeys: Array.from(data.sports),
    }));

    return {
      period: buildPeriodDescriptor(`last_${periodDays}_days`, start.getTime(), now.getTime(), `${periodDays} dias`),
      points,
    };
  }

  // ==========================================
  // MÉTODOS LEGADOS — mantidos para compatibilidade
  // ==========================================

  /**
   * @legacy Visão Geral com ACWR — mantido para compatibilidade.
   * Usa a nova linguagem descritiva (sem 'danger_zone', sem linguagem médica).
   */
  async getOverview(userId: string): Promise<ProgressOverviewDTO> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const sessionsLast28d = await SessionModel.find({
      userId,
      startedAt: { $gte: twentyEightDaysAgo },
    }).sort({ startedAt: -1 }).exec();

    let acuteLoad = 0;
    let chronicSum = 0;
    let weeklyTotalDurationSeconds = 0;
    let weeklySessionsCount = 0;

    for (const session of sessionsLast28d) {
      const load = (session as any).load?.srpe ?? Number(session.sessionalLoad) ?? 0;
      const duration = Number(session.durationSeconds) || 0;
      const sessionDate = new Date(session.startedAt);

      chronicSum += load;

      if (sessionDate >= sevenDaysAgo) {
        acuteLoad += load;
        weeklyTotalDurationSeconds += duration;
        weeklySessionsCount += 1;
      }
    }

    const chronicLoad = Math.max(1, Math.round(chronicSum / 4));
    const ratio = Math.round((acuteLoad / chronicLoad) * 100) / 100;

    // Linguagem descritiva — sem 'danger_zone', sem 'risco de lesão'
    let acwrStatus: AcwrStatus = 'baseline';
    let acwrMessage = 'Carga percebida dentro do seu padrão histórico recente.';

    if (sessionsLast28d.length < 3) {
      acwrStatus = 'insufficient_data';
      acwrMessage = 'Dados insuficientes para comparar com períodos anteriores.';
    } else if (ratio < 0.8) {
      acwrStatus = 'below_baseline';
      acwrMessage = 'Carga percebida abaixo da sua média recente.';
    } else if (ratio > 1.5) {
      acwrStatus = 'high_variation';
      acwrMessage = 'Carga percebida com variação relevante em relação à sua média recente. Observe sua recuperação.';
    } else if (ratio > 1.3) {
      acwrStatus = 'elevated_vs_baseline';
      acwrMessage = 'Carga percebida acima do seu padrão recente. Acompanhe como se sente nos próximos dias.';
    }

    const acwr: AcwrReadout = {
      acuteLoad,
      chronicLoad,
      ratio,
      status: acwrStatus,
      message: acwrMessage,
      disclaimer: LOAD_DISCLAIMER,
    };

    // Streak de dias consecutivos ativos
    const recentSessions = await SessionModel.find({ userId })
      .sort({ startedAt: -1 })
      .limit(60)
      .select('startedAt')
      .lean();
    const totalActiveDaysStreak = calculateActiveStreak(recentSessions.map((s) => s.startedAt));

    // Distribuição por esporte (7 dias)
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
   * @legacy Evolução por esporte — mantido para compatibilidade com rota existente.
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
    }).sort({ startedAt: 1 }).exec();

    let totalSessions = 0;
    let totalDurationSeconds = 0;
    let totalSessionalLoad = 0;

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

    const sportSpecificHighlights: Record<string, any> = {};
    if (sportKey === 'running') {
      const paces = sessions.map((s) => s.metrics?.paceSecondsPerKm).filter((p): p is number => Boolean(p && p > 0));
      sportSpecificHighlights.bestPaceSecondsPerKm = paces.length > 0 ? Math.min(...paces) : null;
      sportSpecificHighlights.totalDistanceKm = Math.round(sessions.reduce((acc, s) => acc + (s.metrics?.distanceMeters || 0) / 1000, 0) * 10) / 10;
    } else if (sportKey === 'strength') {
      const volumes = sessions.map((s) => s.metrics?.totalVolumeKg).filter((v): v is number => Boolean(v && v > 0));
      sportSpecificHighlights.maxVolumeSingleSessionKg = volumes.length > 0 ? Math.max(...volumes) : null;
      sportSpecificHighlights.totalTonnageKg = Math.round(sessions.reduce((acc, s) => acc + (s.metrics?.totalVolumeKg || 0), 0));
    } else if (sportKey === 'boxing') {
      sportSpecificHighlights.totalRounds = sessions.reduce((acc, s) => acc + (s.metrics?.roundsCount || 0), 0);
      sportSpecificHighlights.totalPunchesEstimate = sessions.reduce((acc, s) => acc + (s.metrics?.punchesThrownEstimate || 0), 0);
    }

    return { sportKey, totalSessions, totalDurationSeconds, totalSessionalLoad, weeklyTrend, sportSpecificHighlights };
  }

  /**
   * @legacy Recordes pessoais — mantido.
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
          prs.push({ id: `pr-run-dist-${session._id}`, sportKey: 'running', metricLabel: 'Maior Distância em Corrida', value: `${(session.metrics.distanceMeters / 1000).toFixed(1)} km`, unit: 'km', achievedAt: session.startedAt, sessionId: (session._id as any).toString() });
        }
        if (session.metrics.paceSecondsPerKm && session.metrics.paceSecondsPerKm < fastestRunPace && session.metrics.distanceMeters >= 3000) {
          fastestRunPace = session.metrics.paceSecondsPerKm;
          const mins = Math.floor(fastestRunPace / 60);
          const secs = fastestRunPace % 60;
          prs.push({ id: `pr-run-pace-${session._id}`, sportKey: 'running', metricLabel: 'Melhor Ritmo (Pace)', value: `${mins}:${secs.toString().padStart(2, '0')} /km`, unit: 'min/km', achievedAt: session.startedAt, sessionId: (session._id as any).toString() });
        }
      }

      if (sport === 'strength' && session.metrics?.totalVolumeKg) {
        if (session.metrics.totalVolumeKg > maxStrengthVolumeKg) {
          maxStrengthVolumeKg = session.metrics.totalVolumeKg;
          prs.push({ id: `pr-str-vol-${session._id}`, sportKey: 'strength', metricLabel: 'Maior Volume de Carga (Tonelagem)', value: `${Math.round(maxStrengthVolumeKg)} kg`, unit: 'kg', achievedAt: session.startedAt, sessionId: (session._id as any).toString() });
        }
      }

      if (sport === 'boxing' && session.metrics?.roundsCount) {
        if (session.metrics.roundsCount > maxBoxingRounds) {
          maxBoxingRounds = session.metrics.roundsCount;
          prs.push({ id: `pr-box-rounds-${session._id}`, sportKey: 'boxing', metricLabel: 'Maior Volume de Rounds', value: `${maxBoxingRounds} rounds`, unit: 'rounds', achievedAt: session.startedAt, sessionId: (session._id as any).toString() });
        }
      }

      if (sport === 'football' && session.metrics?.goals !== undefined) {
        if (session.metrics.goals > maxFootballGoals) {
          maxFootballGoals = session.metrics.goals;
          prs.push({ id: `pr-foot-goals-${session._id}`, sportKey: 'football', metricLabel: 'Mais Gols em uma Partida', value: `${maxFootballGoals} gols`, unit: 'gols', achievedAt: session.startedAt, sessionId: (session._id as any).toString() });
        }
      }
    }

    return prs;
  }
}

export const progressService = new ProgressService();
