import {
  DailyReadinessModel,
  type IDailyReadinessDocument,
} from './readiness.model.js';
import { SessionModel } from '../sessions/session.model.js';
import { ProfileModel } from '../profile/profile.model.js';
import { UserSettingsModel } from '../settings/settings.model.js';
import { formatDateInTimeZone, resolveValidTimeZone } from '../progress/streak.service.js';
import type {
  ReadinessStatus,
  TrainingRecommendation,
  UpsertDailyReadinessInput,
} from '@pacelog/shared';

function getTodayDateKey(timezone?: string): string {
  const tz = resolveValidTimeZone(timezone);
  return formatDateInTimeZone(new Date(), tz);
}

/**
 * Calcula o Score de Prontidão (0 a 100) com pesos fisiológicos:
 * - Qualidade do Sono (35%)
 * - Recuperação Muscular / ausência de DOMS severa (30%)
 * - Nível de Energia (25%)
 * - Foco / Controle de Estresse (10%)
 */
export function computeReadinessMetrics(input: {
  sleepQuality: number;
  muscleRecovery: number;
  energyLevel: number;
  focusLevel: number;
  recentAcuteLoad?: number;
}): {
  readinessScore: number;
  readinessStatus: ReadinessStatus;
  recommendation: string;
  trainingRecommendation: TrainingRecommendation;
} {
  const weightedRaw =
    input.sleepQuality * 0.35 +
    input.muscleRecovery * 0.3 +
    input.energyLevel * 0.25 +
    input.focusLevel * 0.1;

  // Normaliza de [1..5] para [20..100]
  const readinessScore = Math.max(
    15,
    Math.min(100, Math.round((weightedRaw / 5) * 100))
  );

  let readinessStatus: ReadinessStatus = 'ready';
  if (readinessScore >= 82) {
    readinessStatus = 'prime';
  } else if (readinessScore >= 65) {
    readinessStatus = 'ready';
  } else if (readinessScore >= 48) {
    readinessStatus = 'moderate';
  } else {
    readinessStatus = 'recover';
  }

  let recommendation = '';
  const highRecentLoad = (input.recentAcuteLoad ?? 0) > 1800;
  const trainingRecommendation: TrainingRecommendation =
    input.muscleRecovery <= 2 || readinessScore < 60
      ? {
          status: 'recovery',
          volumeMultiplier: 0.75,
          advice: 'Reduza o volume e a intensidade hoje para favorecer a recuperação.',
        }
      : readinessScore >= 80
        ? {
            status: 'optimal',
            volumeMultiplier: 1,
            advice: 'Mantenha a carga planejada e aproveite a boa prontidão.',
          }
        : {
            status: 'moderate',
            volumeMultiplier: 0.9,
            advice: 'Modere o ritmo e mantenha o treino abaixo da falha hoje.',
          };

  if (readinessStatus === 'prime') {
    recommendation = highRecentLoad
      ? 'Prontidão máxima apesar da carga alta recente. Excelente dia para buscar performance ou progressão de carga com técnica limpa.'
      : 'Prontidão em nível de pico (Prime). Janela ideal para sessões intensas, tiros de velocidade, sparring ou progressão de carga na musculação.';
  } else if (readinessStatus === 'ready') {
    recommendation =
      input.muscleRecovery <= 2
        ? 'Boa energia geral, mas com fadiga muscular localizada. Priorize grupos musculares descansados ou aquecimento articular estendido.'
        : 'Sistema recuperado e estável. Siga o treino planejado no seu cronograma mantendo RPE entre 7 e 8.';
  } else if (readinessStatus === 'moderate') {
    recommendation =
      input.sleepQuality <= 2
        ? 'Sono abaixo do ideal reduz a tolerância ao volume alto hoje. Mantenha o treino técnico ou reduza 1 série por exercício (RPE máx 6–7).'
        : 'Recuperação moderada. Evite falha concêntrica ou picos máximos de intensidade hoje; priorize consistência e controle técnico.';
  } else {
    recommendation =
      'Sinal claro de fadiga acumulada. Considere converter o dia para recuperação ativa (mobilidade, caminhada leve ou natação regenerativa) e priorizar 8h de sono.';
  }

  return {
    readinessScore,
    readinessStatus,
    recommendation,
    trainingRecommendation,
  };
}

export class DailyReadinessService {
  async getOverview(
    userId: string,
    dateKey?: string
  ): Promise<{
    today: IDailyReadinessDocument | null;
    history: IDailyReadinessDocument[];
  }> {
    let targetDate = dateKey;
    if (!targetDate) {
      const userSettings = await UserSettingsModel.findOne({ userId }).select('timezone').lean();
      targetDate = getTodayDateKey(userSettings?.timezone);
    }

    const [today, history] = await Promise.all([
      DailyReadinessModel.findOne({ userId, dateKey: targetDate }),
      DailyReadinessModel.find({ userId })
        .sort({ dateKey: -1 })
        .limit(7),
    ]);

    return { today, history };
  }

  async upsertReadiness(
    userId: string,
    input: UpsertDailyReadinessInput
  ): Promise<IDailyReadinessDocument> {
    let targetDate = input.dateKey;
    if (!targetDate) {
      const userSettings = await UserSettingsModel.findOne({ userId }).select('timezone').lean();
      targetDate = getTodayDateKey(userSettings?.timezone);
    }
    const weightKg = input.weightKg ?? input.bodyWeightKg;

    // Consulta carga aguda dos últimos 7 dias para contextualizar recomendação
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSessions = await SessionModel.find({
      userId,
      status: 'completed',
      startedAt: { $gte: sevenDaysAgo },
    })
      .select('sessionalLoad')
      .lean();

    const recentAcuteLoad = recentSessions.reduce(
      (acc, s: any) => acc + (Number(s.sessionalLoad) || 0),
      0
    );

    const { readinessScore, readinessStatus, recommendation, trainingRecommendation } =
      computeReadinessMetrics({
        sleepQuality: input.sleepQuality,
        muscleRecovery: input.muscleRecovery,
        energyLevel: input.energyLevel,
        focusLevel: input.focusLevel ?? 3,
        recentAcuteLoad,
      });

    const updated = await DailyReadinessModel.findOneAndUpdate(
      { userId, dateKey: targetDate },
      {
        $set: {
          sleepQuality: input.sleepQuality,
          sleepHours: input.sleepHours,
          muscleRecovery: input.muscleRecovery,
          energyLevel: input.energyLevel,
          focusLevel: input.focusLevel ?? 3,
          bodyWeightKg: weightKg,
          weightKg,
          soreRegions: input.soreRegions ?? [],
          readinessScore,
          readinessStatus,
          recommendation,
          trainingRecommendation,
          notes: input.notes?.trim() || undefined,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (weightKg !== undefined) {
      await ProfileModel.findOneAndUpdate(
        { userId },
        {
          $set: { currentWeightKg: weightKg },
          $setOnInsert: { userId, name: 'Atleta' },
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    return updated;
  }
}

export const dailyReadinessService = new DailyReadinessService();
