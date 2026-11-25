import { SessionModel } from '../sessions/session.model.js';
import { DailyReadinessModel } from '../readiness/readiness.model.js';
import { ActiveStrengthSessionModel } from '../strength/strength-session.model.js';
import { ExerciseModel } from '../strength/exercise.model.js';
import { InjuryModel } from '../injuries/injury.model.js';
import { scopedFilter } from '../../utils/scopedQuery.js';
import { shouldRecommendDeload } from './fatigue.js';
import { computeMuscleFatigueRegions, type MuscleFatigueRegionDTO } from './muscle-fatigue.js';
import type {
  SportKey,
  ProgressOverviewDTO,
  SportProgressDTO,
  TechniqueRepertoireSummary,
  TechniqueRepertoireStat,
  PersonalRecordItem,
  AcwrReadout,
  AcwrStatus,
  WeeklyTrendPoint,
  SportSummaryStats,
  ProgressSummaryDTO,
  ProgressBySportDTO,
  ProgressLoadDTO,
  ProgressTimelineDTO,
  PeriodDescriptor,
  WeekStart,
} from '@pacelog/shared';
import {
  getWeekBounds,
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
import {
  calculateActiveStreak,
  formatDateInTimeZone,
  resolveValidTimeZone,
} from './streak.service.js';
import { UserSettingsModel } from '../settings/settings.model.js';
import { computePrimaryMetric } from '../sessions/sport.rules.js';
import {
  calculateConfidence as calcComparisonConfidence,
  compareRunning,
  compareFootball,
  compareFutevolei,
  compareBoxing,
  compareStrength,
  compareCycling,
  compareJiuJitsu,
  compareSwimming,
} from './comparison/index.js';
import type { ProgressComparisonDTO, SportProgress } from '@pacelog/shared';

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
    cycling: 'Ciclismo',
    jiujitsu: 'Jiu-Jitsu',
  };
  return labels[sportKey] || sportKey;
}

function computeTechniqueRepertoire(
  sessions: Array<{ startedAt: Date | string; metrics?: Record<string, any> }>,
  nowMs: number = Date.now()
): TechniqueRepertoireSummary | undefined {
  const map = new Map<string, { displayName: string; count: number; lastMs: number }>();
  let totalTaggedSessions = 0;

  for (const s of sessions) {
    const raw = s.metrics?.techniquesFocus;
    const list: string[] = Array.isArray(raw)
      ? raw.map((t) => String(t).trim()).filter(Boolean)
      : typeof raw === 'string'
        ? raw.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

    if (list.length === 0) continue;
    totalTaggedSessions += 1;
    const sMs = new Date(s.startedAt).getTime();

    const uniqueInSession = new Set<string>();
    for (const tech of list) {
      const key = tech.toLowerCase();
      if (uniqueInSession.has(key)) continue;
      uniqueInSession.add(key);

      const existing = map.get(key);
      if (!existing) {
        map.set(key, { displayName: tech, count: 1, lastMs: sMs });
      } else {
        existing.count += 1;
        if (sMs >= existing.lastMs) {
          existing.lastMs = sMs;
          existing.displayName = tech;
        }
      }
    }
  }

  const allTechniques: TechniqueRepertoireStat[] = Array.from(map.values())
    .map((entry) => {
      const daysSince = Math.max(0, Math.floor((nowMs - entry.lastMs) / (24 * 60 * 60 * 1000)));
      return {
        name: entry.displayName,
        count: entry.count,
        lastPracticedAt: new Date(entry.lastMs).toISOString(),
        daysSinceLastPractice: daysSince,
        isNeglected: daysSince >= 14,
      };
    })
    .sort((a, b) => b.count - a.count || a.daysSinceLastPractice - b.daysSinceLastPractice);

  const mostPracticed = allTechniques.slice(0, 6);
  const neglected = allTechniques
    .filter((t) => t.isNeglected)
    .sort((a, b) => b.daysSinceLastPractice - a.daysSinceLastPractice);

  return {
    totalTaggedSessions,
    uniqueTechniquesCount: allTechniques.length,
    mostPracticed,
    neglected,
    allTechniques,
  };
}

// ==========================================
// PROGRESS SERVICE
// ==========================================

export class ProgressService {
  async getMuscleFatigueMap(userId: string): Promise<{
    generatedAt: string;
    regions: MuscleFatigueRegionDTO[];
  }> {
    const now = Date.now();
    const since = new Date(now - 72 * 60 * 60 * 1000);
    const [strengthSessions, generalSessions, readiness] = await Promise.all([
      ActiveStrengthSessionModel.find({
        userId,
        status: 'completed',
        finishedAt: { $gte: since },
      }).lean(),
      SessionModel.find({
        userId,
        status: 'completed',
        startedAt: { $gte: since },
        sportKey: { $ne: 'strength' },
      }).select('sportKey startedAt durationSeconds rpe load sessionalLoad').lean(),
      DailyReadinessModel.find({
        userId,
        createdAt: { $gte: since },
      }).select('soreRegions').lean(),
    ]);
    const exerciseKeys = strengthSessions.flatMap((session) =>
      (session.exercises ?? []).map((exercise) => exercise.exerciseKey)
    );
    const exerciseDefinitions = await ExerciseModel.find({ key: { $in: exerciseKeys } })
      .select('key primaryMuscleGroup secondaryMuscleGroups type')
      .lean();

    const regions = computeMuscleFatigueRegions({
      strengthSessions,
      generalSessions,
      readinessEntries: readiness,
      exerciseDefinitions,
      nowMs: now,
    });

    return {
      generatedAt: new Date(now).toISOString(),
      regions,
    };
  }

  async checkDeloadNeed(userId: string): Promise<{
    needed: boolean;
    reasons: string[];
    score: number;
  }> {
    const [timeline, readiness, comparison] = await Promise.all([
      this.getLoadTimeline(userId),
      DailyReadinessModel.find({ userId }).sort({ dateKey: -1 }).limit(5).lean(),
      this.getComparison(userId, 28),
    ]);
    const weeks = timeline.weekly.slice(-4).map((week) => week.totalSrpe);
    const elevatedWeeks = weeks.length >= 3
      ? weeks.slice(1).filter((value, index) => value >= weeks[index] * 0.95).length
      : 0;
    const loadSignal = elevatedWeeks >= 2 && weeks.at(-1)! > (timeline.baseline.fourWeekAvg || 0);
    const readinessSignal = (() => {
      if (readiness.length < 3) return false;
      const recentWindow = readiness.slice(0, Math.ceil(readiness.length / 2));
      const previousWindow = readiness.slice(Math.ceil(readiness.length / 2));
      const average = (items: typeof readiness) => ({
        score: items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length,
        muscle: items.reduce((sum, item) => sum + item.muscleRecovery, 0) / items.length,
        energy: items.reduce((sum, item) => sum + item.energyLevel, 0) / items.length,
      });
      const recentAverage = average(recentWindow);
      const previousAverage = average(previousWindow);

      return (
        recentAverage.score <= previousAverage.score - 5 ||
        recentAverage.muscle <= previousAverage.muscle - 0.5 ||
        recentAverage.energy <= previousAverage.energy - 0.5
      );
    })();
    const performanceSignal = comparison.sports.some(
      (sport) =>
        sport.primaryMetric.status === 'declined' ||
        (sport.primaryMetric.status === 'stable' && sport.sessions.current >= 3)
    );
    const reasons: string[] = [];
    if (loadSignal) reasons.push('carga elevada ou crescente por várias semanas');
    if (readinessSignal) reasons.push('queda recente na prontidão média');
    if (performanceSignal) reasons.push('estagnação ou queda de rendimento');
    return {
      needed: shouldRecommendDeload([loadSignal, readinessSignal, performanceSignal]),
      reasons,
      score: reasons.length,
    };
  }

  async getWeightHistory(userId: string, periodDays = 42): Promise<{
    points: Array<{ dateKey: string; weightKg: number }>;
    currentWeightKg: number | null;
    deltaKg: number;
  }> {
    const start = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const entries = await DailyReadinessModel.find({
      userId,
      dateKey: { $gte: start.toISOString().slice(0, 10) },
      $or: [
        { bodyWeightKg: { $exists: true, $ne: null } },
        { weightKg: { $exists: true, $ne: null } },
      ],
    })
      .sort({ dateKey: 1 })
      .select('dateKey bodyWeightKg weightKg')
      .lean();
    const points = entries.map((entry) => ({
      dateKey: entry.dateKey,
      weightKg: Number(entry.weightKg ?? entry.bodyWeightKg),
    }));
    return {
      points,
      currentWeightKg: points.at(-1)?.weightKg ?? null,
      deltaKg:
        points.length > 1
          ? Number((points.at(-1)!.weightKg - points[0].weightKg).toFixed(2))
          : 0,
    };
  }

  /**
   * GET /api/progress/comparison
   * Novo endpoint para o dashboard V2: ranking de evolução, eficiência e comparativos relativos.
   */
  async getComparison(userId: string, periodDays = 30): Promise<ProgressComparisonDTO> {
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const baselineStart = new Date(now.getTime() - periodDays * 2 * 24 * 60 * 60 * 1000);

    const [currentSessions, baselineSessions, userSettings] = await Promise.all([
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
      UserSettingsModel.findOne({ userId }).select('timezone').lean(),
    ]);

    const tz = resolveValidTimeZone(userSettings?.timezone);

    // Calcular stats de consistência (no fuso horário do atleta)
    const currentDays = new Set(currentSessions.map(s => formatDateInTimeZone(new Date(s.startedAt), tz))).size;
    const baselineDays = new Set(baselineSessions.map(s => formatDateInTimeZone(new Date(s.startedAt), tz))).size;

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
      
      let effectiveCurrent = sportCurrent;
      let effectiveBaseline = sportBaseline;

      // Se não há sessões anteriores aos 30 dias (ex: atleta novo), mas há pelo menos 2 sessões registradas,
      // utiliza a primeira metade como baseline de referência para permitir comparação imediata de evolução
      if (effectiveBaseline.length === 0 && effectiveCurrent.length >= 2) {
        const splitIdx = Math.max(1, Math.floor(effectiveCurrent.length / 2));
        effectiveBaseline = effectiveCurrent.slice(0, splitIdx);
        effectiveCurrent = effectiveCurrent.slice(splitIdx);
      }

      const currentSrpe = sportCurrent.reduce((acc, s) => acc + ((s as any).load?.srpe ?? s.sessionalLoad ?? 0), 0);
      const baselineSrpe = (effectiveBaseline.length > 0 ? effectiveBaseline : sportBaseline).reduce((acc, s) => acc + ((s as any).load?.srpe ?? s.sessionalLoad ?? 0), 0);
      
      const variationPercent = baselineSrpe > 0
        ? Math.round(((currentSrpe - baselineSrpe) / baselineSrpe) * 1000) / 10
        : null;

      const conf = calcComparisonConfidence(sportCurrent.length, periodDays);

      let compResult = { primaryMetric: null as any, secondaryMetrics: [] as any[], evidence: [] as string[] };
      
      if (sportKey === 'running') compResult = compareRunning(effectiveCurrent as any, effectiveBaseline as any);
      else if (sportKey === 'football') compResult = compareFootball(effectiveCurrent as any, effectiveBaseline as any);
      else if (sportKey === 'futevolei') compResult = compareFutevolei(effectiveCurrent as any, effectiveBaseline as any);
      else if (sportKey === 'boxing') compResult = compareBoxing(effectiveCurrent as any, effectiveBaseline as any);
      else if (sportKey === 'strength') compResult = compareStrength(effectiveCurrent as any, effectiveBaseline as any);
      else if (sportKey === 'cycling') compResult = compareCycling(effectiveCurrent as any, effectiveBaseline as any);
      else if (sportKey === 'jiujitsu') compResult = compareJiuJitsu(effectiveCurrent as any, effectiveBaseline as any);
      else if (sportKey === 'swimming') compResult = compareSwimming(effectiveCurrent as any, effectiveBaseline as any);

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

    // Distribuição real por esporte sobre todas as sessões atuais (independente de compResult.primaryMetric)
    const sportLoadMap = new Map<SportKey, number>();
    for (const s of currentSessions) {
      const srpe = (s as any).load?.srpe ?? s.sessionalLoad ?? 0;
      sportLoadMap.set(s.sportKey, (sportLoadMap.get(s.sportKey) ?? 0) + srpe);
    }

    const distributionBySport = Array.from(sportLoadMap.entries()).map(([sportKey, srpe]) => ({
      sportKey,
      srpe,
      sharePercent: currentSrpe > 0 ? Math.round((srpe / currentSrpe) * 1000) / 10 : 0,
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
   * Suporta periodDays (dias deslizantes) ou weekOffset (0 = semana atual, -1 = semana anterior, etc.)
   * respeitando o `weekStart` configurado pelo usuário ('monday' ou 'sunday').
   */
  async getSummary(
    userId: string,
    options: number | { periodDays?: number; weekOffset?: number } = 7
  ): Promise<ProgressSummaryDTO> {
    const isWeekOffset = typeof options === 'object' && options?.weekOffset !== undefined;
    const weekOffset = isWeekOffset ? Number(options.weekOffset) : 0;
    const periodDays = typeof options === 'number' ? options : (options?.periodDays ?? 7);

    const userSettings = await UserSettingsModel.findOne({ userId }).select('weekStart').lean();
    const weekStart: WeekStart = userSettings?.weekStart === 'sunday' ? 'sunday' : 'monday';

    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;
    let periodKey: string;
    let periodLabel: string;
    let baselineStart: Date;
    let baselineEnd: Date;
    let windowLabel: string;

    if (isWeekOffset) {
      const bounds = getWeekBounds(now, weekStart, weekOffset);
      periodStart = bounds.start;
      periodEnd = bounds.end;
      periodKey = weekOffset === 0 ? 'current_week' : `week_${weekOffset}`;

      const startStr = periodStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const endStr = periodEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      periodLabel = `${startStr} – ${endStr}`;

      // Baseline: semana anterior imediata
      const prevBounds = getWeekBounds(now, weekStart, weekOffset - 1);
      baselineStart = prevBounds.start;
      baselineEnd = prevBounds.end;

      windowLabel = weekOffset === 0 ? 'semana passada' : 'semana anterior';
    } else {
      periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
      periodEnd = now;
      periodKey = `last_${periodDays}_days`;
      periodLabel = periodDays === 7 ? '7 dias' : `${periodDays} dias`;

      baselineStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
      baselineEnd = periodStart;
      windowLabel = 'das últimas 4 semanas';
    }

    // Sessões do período selecionado, do baseline e primeira sessão histórica
    const [currentSessions, baselineSessions, firstSession] = await Promise.all([
      SessionModel.find({
        userId,
        startedAt: { $gte: periodStart, $lte: periodEnd },
        status: 'completed',
      }).sort({ startedAt: 1 }).exec(),
      SessionModel.find({
        userId,
        startedAt: { $gte: baselineStart, $lte: baselineEnd },
        status: 'completed',
      }).sort({ startedAt: 1 }).exec(),
      SessionModel.findOne({ userId, status: 'completed' })
        .sort({ startedAt: 1 })
        .select('startedAt')
        .lean()
        .exec(),
    ]);

    // Carga total do período selecionado
    const currentSrpe = currentSessions.reduce((acc, s) => {
      return acc + ((s as any).load?.srpe ?? s.sessionalLoad ?? 0);
    }, 0);

    let baselineSrpe = 0;
    if (isWeekOffset) {
      // Para visão semanal, compara diretamente com a carga total da semana anterior
      baselineSrpe = baselineSessions.reduce((acc, s) => {
        return acc + ((s as any).load?.srpe ?? s.sessionalLoad ?? 0);
      }, 0);
    } else {
      // Baseline de 4 semanas para períodos livres/móveis
      const weeklyLoads = calculateWeeklySrpeLoad(baselineSessions as any[], weekStart);
      baselineSrpe = calculateFourWeekBaseline(weeklyLoads) ?? 0;
    }

    const variationPercent = baselineSrpe > 0
      ? Math.round(((currentSrpe - baselineSrpe) / Math.abs(baselineSrpe)) * 1000) / 10
      : 0;

    const earliestDate = firstSession?.startedAt ?? baselineSessions[0]?.startedAt ?? currentSessions[0]?.startedAt ?? now;
    const historyDays = Math.ceil((now.getTime() - new Date(earliestDate).getTime()) / (24 * 60 * 60 * 1000));
    const totalSessions = Math.max(currentSessions.length, currentSessions.length + baselineSessions.length);
    const confidence = calculateConfidence(totalSessions, historyDays);
    const status = classifyLoadVariation(variationPercent, confidence);

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
      baselineSrpe: 0,
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
      periodKey,
      periodStart.getTime(),
      periodEnd.getTime(),
      periodLabel
    );

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
        windowLabel,
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
      sessionsCount: currentSessions.length,
    } as ProgressSummaryDTO;
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
    if (primaryMetric && baselineSessions.length >= 1) {
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

    const [sessions, userSettings] = await Promise.all([
      SessionModel.find({
        userId,
        status: 'completed',
        startedAt: { $gte: eightWeeksAgo },
      }).sort({ startedAt: 1 }).exec(),
      UserSettingsModel.findOne({ userId }).select('weekStart').lean(),
    ]);

    const weekStart: WeekStart = userSettings?.weekStart === 'sunday' ? 'sunday' : 'monday';

    const weekly = calculateWeeklySrpeLoad(sessions as any[], weekStart);
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

    const [sessions, userSettings] = await Promise.all([
      SessionModel.find({
        userId,
        status: 'completed',
        startedAt: { $gte: start },
      }).sort({ startedAt: 1 }).exec(),
      UserSettingsModel.findOne({ userId }).select('timezone').lean(),
    ]);

    const tz = resolveValidTimeZone(userSettings?.timezone);
    const dayMap = new Map<string, { srpe: number; count: number; sports: Set<SportKey> }>();

    for (const s of sessions) {
      const day = formatDateInTimeZone(new Date(s.startedAt), tz);
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
      status: 'completed',
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

    // Streak de dias consecutivos ativos (respeitando o fuso horário e streakGraceDays do atleta)
    const [recentSessions, userSettings] = await Promise.all([
      SessionModel.find({ userId, status: 'completed' })
        .sort({ startedAt: -1 })
        .limit(60)
        .select('startedAt')
        .lean(),
      UserSettingsModel.findOne({ userId }).select('timezone streakGraceDays').lean(),
    ]);
    const totalActiveDaysStreak = calculateActiveStreak(
      recentSessions.map((s) => s.startedAt),
      new Date(),
      userSettings?.timezone,
      userSettings?.streakGraceDays ?? 0
    );

    // Distribuição por esporte (7 dias)
    const sportsAgg = await SessionModel.aggregate([
      { $match: { userId, status: 'completed', startedAt: { $gte: sevenDaysAgo } } },
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
    const recentInjuries = await InjuryModel.find(
      scopedFilter(userId, { status: { $in: ['active', 'recovering'] } })
    )
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();
    const injurySummary = recentInjuries.map((injury: any) => ({
      id: injury._id.toString(),
      region: injury.region,
      side: injury.side,
      severity: injury.severity,
      category: injury.category,
      status: injury.status,
      updatedAt: injury.updatedAt,
    }));

    return {
      acwr,
      totalActiveDaysStreak,
      weeklyTotalDurationSeconds,
      weeklyTotalSessionalLoad: acuteLoad,
      weeklySessionsCount,
      sportsBreakdown,
      recentPersonalRecords: recentPersonalRecords.slice(0, 4),
      injurySummary,
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
    const repertoireStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const [sessions, repertoireSessions] = await Promise.all([
      SessionModel.find({
        userId,
        sportKey,
        status: 'completed',
        startedAt: { $gte: startDate },
      }).sort({ startedAt: 1 }).exec(),
      ['jiujitsu', 'boxing', 'futevolei'].includes(sportKey)
        ? SessionModel.find({
            userId,
            sportKey,
            status: 'completed',
            startedAt: { $gte: repertoireStartDate },
          })
            .select('startedAt metrics')
            .sort({ startedAt: 1 })
            .lean()
            .exec()
        : Promise.resolve([]),
    ]);

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

        if (sportKey === 'running' && (session.metrics?.distanceMeters || session.metrics?.distanceKm)) {
          item.volume += session.metrics.distanceKm ?? (session.metrics.distanceMeters / 1000);
        } else if (sportKey === 'strength' && session.metrics?.totalVolumeKg) {
          item.volume += session.metrics.totalVolumeKg;
        } else if (sportKey === 'boxing' && session.metrics?.roundsCount) {
          item.volume += session.metrics.roundsCount;
        } else if (sportKey === 'cycling' && (session.metrics?.distanceKm || session.metrics?.distanceMeters)) {
          item.volume += session.metrics.distanceKm ?? (session.metrics.distanceMeters / 1000);
        } else if (sportKey === 'jiujitsu' && session.metrics?.roundsCount) {
          item.volume += session.metrics.roundsCount;
        } else if (sportKey === 'swimming' && (session.metrics?.totalDistanceMeters || session.metrics?.distanceMeters)) {
          item.volume += (session.metrics.totalDistanceMeters || session.metrics.distanceMeters) / 1000;
        } else if (sportKey === 'futevolei' && session.metrics?.setsCount) {
          item.volume += session.metrics.setsCount;
        } else if (sportKey === 'football') {
          item.volume += Math.round((session.durationSeconds || 0) / 60);
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
      sportSpecificHighlights.totalDistanceKm = Math.round(sessions.reduce((acc, s) => acc + (s.metrics?.distanceKm ?? ((s.metrics?.distanceMeters || 0) / 1000)), 0) * 10) / 10;
    } else if (sportKey === 'strength') {
      const volumes = sessions.map((s) => s.metrics?.totalVolumeKg).filter((v): v is number => Boolean(v && v > 0));
      sportSpecificHighlights.maxVolumeSingleSessionKg = volumes.length > 0 ? Math.max(...volumes) : null;
      sportSpecificHighlights.totalTonnageKg = Math.round(sessions.reduce((acc, s) => acc + (s.metrics?.totalVolumeKg || 0), 0));
    } else if (sportKey === 'boxing') {
      sportSpecificHighlights.totalRounds = sessions.reduce((acc, s) => acc + (s.metrics?.roundsCount || 0), 0);
      sportSpecificHighlights.totalPunchesEstimate = sessions.reduce((acc, s) => acc + (s.metrics?.punchesThrownEstimate || 0), 0);
    } else if (sportKey === 'cycling') {
      const speeds = sessions.map((s) => s.metrics?.averageSpeedKmh).filter((v): v is number => Boolean(v && v > 0));
      sportSpecificHighlights.bestSpeedKmh = speeds.length > 0 ? Math.max(...speeds) : null;
      sportSpecificHighlights.totalDistanceKm = Math.round(sessions.reduce((acc, s) => acc + (s.metrics?.distanceKm ?? ((s.metrics?.distanceMeters || 0) / 1000)), 0) * 10) / 10;
    } else if (sportKey === 'jiujitsu') {
      sportSpecificHighlights.totalRounds = sessions.reduce((acc, s) => acc + (s.metrics?.roundsCount || 0), 0);
      sportSpecificHighlights.totalSubmissionsLanded = sessions.reduce((acc, s) => acc + (s.metrics?.submissionsLanded || 0), 0);
    } else if (sportKey === 'swimming') {
      const paces = sessions.map((s) => s.metrics?.paceSecondsPer100m).filter((p): p is number => Boolean(p && p > 0));
      sportSpecificHighlights.bestPaceSecondsPer100m = paces.length > 0 ? Math.min(...paces) : null;
      sportSpecificHighlights.totalDistanceMeters = Math.round(sessions.reduce((acc, s) => acc + (s.metrics?.totalDistanceMeters || s.metrics?.distanceMeters || 0), 0));
    } else if (sportKey === 'futevolei') {
      sportSpecificHighlights.totalSets = sessions.reduce((acc, s) => acc + (s.metrics?.setsCount || 0), 0);
      sportSpecificHighlights.totalSetsWon = sessions.reduce((acc, s) => acc + (s.metrics?.setsWon || 0), 0);
    } else if (sportKey === 'football') {
      sportSpecificHighlights.totalGoals = sessions.reduce((acc, s) => acc + (s.metrics?.goals || 0), 0);
      sportSpecificHighlights.totalAssists = sessions.reduce((acc, s) => acc + (s.metrics?.assists || 0), 0);
    }

    const techniqueRepertoire = ['jiujitsu', 'boxing', 'futevolei'].includes(sportKey)
      ? computeTechniqueRepertoire(repertoireSessions as any[], now.getTime())
      : undefined;

    return {
      sportKey,
      totalSessions,
      totalDurationSeconds,
      totalSessionalLoad,
      weeklyTrend,
      sportSpecificHighlights,
      ...(techniqueRepertoire ? { techniqueRepertoire } : {}),
    };
  }

  /**
   * @legacy Recordes pessoais — retorna apenas o melhor recorde verdadeiro por métrica/esporte.
   */
  async getPersonalRecords(userId: string): Promise<PersonalRecordItem[]> {
    const sessions = await SessionModel.find({ userId, status: 'completed' }).sort({ startedAt: -1 }).exec();

    const prMap = new Map<string, { numValue: number; isLowerBetter?: boolean; item: PersonalRecordItem }>();

    const upsertPr = (key: string, numValue: number, item: PersonalRecordItem, isLowerBetter = false) => {
      const existing = prMap.get(key);
      if (
        !existing ||
        (isLowerBetter ? numValue < existing.numValue : numValue > existing.numValue)
      ) {
        prMap.set(key, { numValue, isLowerBetter, item });
      }
    };

    for (const session of sessions) {
      const sport = session.sportKey;
      const sessionId = (session._id as any).toString();
      const m = session.metrics || {};

      if (sport === 'running') {
        const distMeters = m.distanceMeters || (m.distanceKm ? m.distanceKm * 1000 : 0);
        if (distMeters > 0) {
          upsertPr('run-dist', distMeters, {
            id: `pr-run-dist-${sessionId}`,
            sportKey: 'running',
            metricLabel: 'Maior Distância em Corrida',
            value: `${(distMeters / 1000).toFixed(1)} km`,
            unit: 'km',
            achievedAt: session.startedAt,
            sessionId,
          });
        }
        if (m.paceSecondsPerKm && m.paceSecondsPerKm > 0 && distMeters >= 3000) {
          const mins = Math.floor(m.paceSecondsPerKm / 60);
          const secs = Math.round(m.paceSecondsPerKm % 60);
          upsertPr(
            'run-pace',
            m.paceSecondsPerKm,
            {
              id: `pr-run-pace-${sessionId}`,
              sportKey: 'running',
              metricLabel: 'Melhor Ritmo (Pace)',
              value: `${mins}:${secs.toString().padStart(2, '0')} /km`,
              unit: 'min/km',
              achievedAt: session.startedAt,
              sessionId,
            },
            true
          );
        }
      }

      if (sport === 'cycling') {
        const distKm = m.distanceKm ?? (m.distanceMeters ? m.distanceMeters / 1000 : 0);
        if (distKm > 0) {
          upsertPr('cyc-dist', distKm, {
            id: `pr-cyc-dist-${sessionId}`,
            sportKey: 'cycling',
            metricLabel: 'Maior Pedal (Distância)',
            value: `${Number(distKm).toFixed(1)} km`,
            unit: 'km',
            achievedAt: session.startedAt,
            sessionId,
          });
        }
        if (m.averageSpeedKmh && m.averageSpeedKmh > 0) {
          upsertPr('cyc-speed', m.averageSpeedKmh, {
            id: `pr-cyc-speed-${sessionId}`,
            sportKey: 'cycling',
            metricLabel: 'Maior Velocidade Média',
            value: `${Number(m.averageSpeedKmh).toFixed(1)} km/h`,
            unit: 'km/h',
            achievedAt: session.startedAt,
            sessionId,
          });
        }
      }

      if (sport === 'swimming') {
        const distMeters = m.totalDistanceMeters || m.distanceMeters || 0;
        if (distMeters > 0) {
          upsertPr('swim-dist', distMeters, {
            id: `pr-swim-dist-${sessionId}`,
            sportKey: 'swimming',
            metricLabel: 'Maior Distância na Natação',
            value: `${Math.round(distMeters)} m`,
            unit: 'm',
            achievedAt: session.startedAt,
            sessionId,
          });
        }
      }

      if (sport === 'strength' && m.totalVolumeKg && m.totalVolumeKg > 0) {
        upsertPr('str-vol', m.totalVolumeKg, {
          id: `pr-str-vol-${sessionId}`,
          sportKey: 'strength',
          metricLabel: 'Maior Volume de Carga (Tonelagem)',
          value: `${Math.round(m.totalVolumeKg)} kg`,
          unit: 'kg',
          achievedAt: session.startedAt,
          sessionId,
        });
      }

      if (sport === 'boxing' && m.roundsCount && m.roundsCount > 0) {
        upsertPr('box-rounds', m.roundsCount, {
          id: `pr-box-rounds-${sessionId}`,
          sportKey: 'boxing',
          metricLabel: 'Maior Volume de Rounds',
          value: `${m.roundsCount} rounds`,
          unit: 'rounds',
          achievedAt: session.startedAt,
          sessionId,
        });
      }

      if (sport === 'jiujitsu' && m.roundsCount && m.roundsCount > 0) {
        upsertPr('bjj-rounds', m.roundsCount, {
          id: `pr-bjj-rounds-${sessionId}`,
          sportKey: 'jiujitsu',
          metricLabel: 'Maior Volume de Rolas',
          value: `${m.roundsCount} rolas`,
          unit: 'rolas',
          achievedAt: session.startedAt,
          sessionId,
        });
      }

      if (sport === 'football' && m.goals !== undefined && m.goals > 0) {
        upsertPr('foot-goals', m.goals, {
          id: `pr-foot-goals-${sessionId}`,
          sportKey: 'football',
          metricLabel: 'Mais Gols em uma Partida',
          value: `${m.goals} gols`,
          unit: 'gols',
          achievedAt: session.startedAt,
          sessionId,
        });
      }

      if (sport === 'futevolei' && m.setsWon !== undefined && m.setsWon > 0) {
        upsertPr('futv-sets', m.setsWon, {
          id: `pr-futv-sets-${sessionId}`,
          sportKey: 'futevolei',
          metricLabel: 'Mais Sets Vencidos',
          value: `${m.setsWon} sets`,
          unit: 'sets',
          achievedAt: session.startedAt,
          sessionId,
        });
      }
    }

    return Array.from(prMap.values())
      .map((entry) => entry.item)
      .sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime());
  }
}

export const progressService = new ProgressService();
