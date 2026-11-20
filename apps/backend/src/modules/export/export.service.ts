import { SessionModel } from '../sessions/session.model.js';
import { GoalModel } from '../goals/goal.model.js';
import { GearModel } from '../gear/gear.model.js';
import { ProfileModel } from '../profile/profile.model.js';
import { UserSettingsModel } from '../settings/settings.model.js';
import { UserSportModel } from '../settings/userSport.model.js';
import { PhysiqueAssessmentModel } from '../physique/physique.model.js';
import { WeeklyScheduleModel } from '../schedule/schedule.model.js';
import { DailyReadinessModel } from '../readiness/readiness.model.js';
import { StrengthRoutineModel } from '../strength/strength-routine.model.js';
import { ActiveStrengthSessionModel } from '../strength/strength-session.model.js';
import { InjuryModel } from '../injuries/injury.model.js';
import { progressService } from '../progress/progress.service.js';
import { goalService } from '../goals/goal.service.js';
import { scopedFilter } from '../../utils/scopedQuery.js';
import type { WeeklyReportDTO } from '@pacelog/shared';

export class ExportService {
  /**
   * Exporta as sessões do atleta para formato JSON.
   */
  async exportSessionsJSON(userId: string, startDate?: Date, endDate?: Date) {
    const filter: Record<string, any> = {};
    if (startDate || endDate) {
      filter.startedAt = {};
      if (startDate) filter.startedAt.$gte = startDate;
      if (endDate) filter.startedAt.$lte = endDate;
    }

    const sessions = await SessionModel.find(scopedFilter(userId, filter))
      .sort({ startedAt: -1 })
      .lean()
      .exec();

    return sessions.map((s) => {
      const { _id, __v, userId: _, ...rest } = s as any;
      return { id: _id.toString(), ...rest };
    });
  }

  /**
   * Exporta um backup completo com perfil, configurações, sessões, metas, equipamentos, cronograma, prontidão, fichas e avaliações físicas.
   */
  async exportBackupJSON(userId: string) {
    const [
      profile,
      settings,
      userSports,
      sessions,
      goals,
      shoes,
      physiqueAssessments,
      weeklySchedule,
      dailyReadiness,
      strengthRoutines,
      strengthSessions,
      injuries,
    ] = await Promise.all([
      ProfileModel.findOne(scopedFilter(userId)).lean(),
      UserSettingsModel.findOne({ userId }).lean(),
      UserSportModel.find({ userId }).lean(),
      SessionModel.find(scopedFilter(userId)).sort({ startedAt: -1 }).lean(),
      GoalModel.find(scopedFilter(userId)).lean(),
      GearModel.find(scopedFilter(userId)).lean(),
      PhysiqueAssessmentModel.find(scopedFilter(userId)).sort({ createdAt: -1 }).lean(),
      WeeklyScheduleModel.findOne({ userId }).lean(),
      DailyReadinessModel.find({ userId }).sort({ dateKey: -1 }).lean(),
      StrengthRoutineModel.find({ userId }).lean(),
      ActiveStrengthSessionModel.find({ userId }).sort({ startedAt: -1 }).lean(),
      InjuryModel.find(scopedFilter(userId)).sort({ updatedAt: -1 }).lean(),
    ]);

    return {
      version: '1.1',
      exportedAt: new Date().toISOString(),
      profile: profile ? { ...profile, _id: undefined, __v: undefined } : null,
      settings: settings ? { ...settings, _id: undefined, __v: undefined } : null,
      userSports: userSports.map((s: any) => ({ ...s, _id: undefined, __v: undefined })),
      sessions: sessions.map((s: any) => ({ ...s, _id: undefined, __v: undefined })),
      goals: goals.map((g: any) => ({ ...g, _id: undefined, __v: undefined })),
      shoes: shoes.map((sh: any) => ({ ...sh, _id: undefined, __v: undefined })),
      physiqueAssessments: physiqueAssessments.map((pa: any) => ({
        ...pa,
        _id: undefined,
        __v: undefined,
      })),
      weeklySchedule: weeklySchedule ? { ...weeklySchedule, _id: undefined, __v: undefined } : null,
      dailyReadiness: dailyReadiness.map((dr: any) => ({ ...dr, _id: undefined, __v: undefined })),
      strengthRoutines: strengthRoutines.map((sr: any) => ({ ...sr, _id: undefined, __v: undefined })),
      strengthSessions: strengthSessions.map((ss: any) => ({ ...ss, _id: undefined, __v: undefined })),
      injuries: injuries.map((injury: any) => ({ ...injury, _id: undefined, __v: undefined })),
    };
  }

  /**
   * Importa dados de um arquivo de backup validado (modo merge ou replace).
   */
  async importBackupData(
    userId: string,
    backupData: {
      mode?: 'merge' | 'replace';
      data: {
        sessions?: any[] | null;
        goals?: any[] | null;
        shoes?: any[] | null;
        physiqueAssessments?: any[] | null;
        settings?: any;
        profile?: any;
        userSports?: any[] | null;
        weeklySchedule?: any;
        dailyReadiness?: any[] | null;
        strengthRoutines?: any[] | null;
        strengthSessions?: any[] | null;
        injuries?: any[] | null;
      };
    }
  ) {
    const mode = backupData.mode || 'merge';
    const sessions = backupData.data.sessions || [];
    const goals = backupData.data.goals || [];
    const shoes = backupData.data.shoes || [];
    const physiqueAssessments = backupData.data.physiqueAssessments || [];
    const userSports = backupData.data.userSports || [];
    const dailyReadiness = backupData.data.dailyReadiness || [];
    const strengthRoutines = backupData.data.strengthRoutines || [];
    const strengthSessions = backupData.data.strengthSessions || [];
    const injuries = backupData.data.injuries || [];
    const { settings, profile, weeklySchedule } = backupData.data;

    let importedSessionsCount = 0;
    let importedGoalsCount = 0;
    let importedShoesCount = 0;
    let importedPhysiqueAssessmentsCount = 0;

    // Se o modo for REPLACE, limpa dados anteriores do usuário
    if (mode === 'replace') {
      await Promise.all([
        SessionModel.deleteMany({ userId }),
        GoalModel.deleteMany({ userId }),
        GearModel.deleteMany({ userId }),
        PhysiqueAssessmentModel.deleteMany({ userId }),
        ...(userSports.length > 0 ? [UserSportModel.deleteMany({ userId })] : []),
        ...(dailyReadiness.length > 0 ? [DailyReadinessModel.deleteMany({ userId })] : []),
        ...(strengthRoutines.length > 0 ? [StrengthRoutineModel.deleteMany({ userId })] : []),
        ...(strengthSessions.length > 0 ? [ActiveStrengthSessionModel.deleteMany({ userId })] : []),
        ...(injuries.length > 0 ? [InjuryModel.deleteMany(scopedFilter(userId))] : []),
      ]);
    }

    // Importa/Atualiza Settings se fornecido
    if (settings) {
      const { _id: _sId, __v: _sV, ...cleanSettings } = settings;
      await UserSettingsModel.findOneAndUpdate(
        { userId },
        { $set: { ...cleanSettings, userId } },
        { upsert: true, new: true }
      );
    }

    // Importa/Atualiza Profile se fornecido
    if (profile) {
      const { _id: _pId, __v: _pV, ...cleanProfile } = profile;
      await ProfileModel.findOneAndUpdate(
        { userId },
        { $set: { ...cleanProfile, userId } },
        { upsert: true, new: true }
      );
    }

    // Importa/Atualiza Esportes do Usuário se fornecido
    for (const sportData of userSports) {
      if (!sportData.sportKey) continue;
      const { _id: _spId, __v: _spV, ...cleanSport } = sportData;
      await UserSportModel.findOneAndUpdate(
        { userId, sportKey: sportData.sportKey },
        { $set: { ...cleanSport, userId } },
        { upsert: true, new: true }
      );
    }

    // Importa Cronograma Semanal se fornecido
    if (weeklySchedule && Array.isArray(weeklySchedule.days)) {
      await WeeklyScheduleModel.findOneAndUpdate(
        { userId },
        { $set: { userId, days: weeklySchedule.days } },
        { upsert: true, new: true }
      );
    }

    // Importa Sessões
    for (const sessionData of sessions) {
      if (!sessionData.startedAt || !sessionData.sportKey) continue;

      // No modo merge, previne duplicatas pelo clientUuid ou pela combinação startedAt + sportKey
      if (mode === 'merge') {
        const query: any = { userId };
        if (sessionData.clientUuid) {
          query.clientUuid = sessionData.clientUuid;
        } else {
          query.startedAt = new Date(sessionData.startedAt);
          query.sportKey = sessionData.sportKey;
        }

        const exists = await SessionModel.findOne(query);
        if (exists) continue; // Pula duplicata
      }

      const { _id: _sessId, __v: _sessV, ...cleanSession } = sessionData;
      await SessionModel.create({
        ...cleanSession,
        userId,
        startedAt: new Date(sessionData.startedAt),
        endedAt: sessionData.endedAt ? new Date(sessionData.endedAt) : undefined,
      });
      importedSessionsCount++;
    }

    // Importa Metas
    for (const goalData of goals) {
      if (!goalData.title) continue;
      if (mode === 'merge') {
        const exists = await GoalModel.findOne({ userId, title: goalData.title });
        if (exists) continue;
      }
      const { _id: _gId, __v: _gV, ...cleanGoal } = goalData;
      const deadlineVal = goalData.deadline || goalData.targetDate;
      await GoalModel.create({
        ...cleanGoal,
        userId,
        startDate: goalData.startDate ? new Date(goalData.startDate) : new Date(),
        deadline: deadlineVal ? new Date(deadlineVal) : undefined,
        completedAt: goalData.completedAt ? new Date(goalData.completedAt) : undefined,
        pausedAt: goalData.pausedAt ? new Date(goalData.pausedAt) : undefined,
      });
      importedGoalsCount++;
    }

    // Importa Equipamentos / Tênis (suporta modelo atual `model` e formato legado `name`)
    for (const shoeData of shoes) {
      const modelName = shoeData.model || shoeData.name;
      if (!modelName) continue;
      if (mode === 'merge') {
        const exists = await GearModel.findOne({
          userId,
          model: modelName,
          ...(shoeData.brand ? { brand: shoeData.brand } : {}),
        });
        if (exists) continue;
      }
      const { _id: _shId, __v: _shV, name: _legacyName, ...cleanShoe } = shoeData;
      const purchaseDateVal = shoeData.purchaseDate || shoeData.purchasedAt;
      await GearModel.create({
        ...cleanShoe,
        model: modelName,
        category: shoeData.category || 'running_shoe',
        userId,
        purchaseDate: purchaseDateVal ? new Date(purchaseDateVal) : undefined,
        startedUsingAt: shoeData.startedUsingAt ? new Date(shoeData.startedUsingAt) : undefined,
        initialDistanceKm: Number(shoeData.initialDistanceKm ?? 0),
        accumulatedDistanceKm: Number(shoeData.accumulatedDistanceKm ?? shoeData.currentDistanceKm ?? 0),
        distanceLimitKm: shoeData.distanceLimitKm ?? shoeData.maxDistanceKm ?? undefined,
      });
      importedShoesCount++;
    }

    // Importa Avaliações Físicas (nunca importa campos de imagem)
    for (const assessmentData of physiqueAssessments) {
      if (!assessmentData.heightCm || !assessmentData.weightKg || !assessmentData.result) continue;
      const createdAt = assessmentData.createdAt ? new Date(assessmentData.createdAt) : new Date();
      if (mode === 'merge') {
        const exists = await PhysiqueAssessmentModel.findOne({
          userId,
          createdAt,
        });
        if (exists) continue;
      }
      const {
        images: _ignoredImages,
        poses: _ignoredPoses,
        _id: _ignoredId,
        __v: _ignoredV,
        ...cleanAssessment
      } = assessmentData;
      await PhysiqueAssessmentModel.create({
        ...cleanAssessment,
        userId,
        createdAt,
      });
      importedPhysiqueAssessmentsCount++;
    }

    // Importa Prontidão Diária
    for (const readinessData of dailyReadiness) {
      if (!readinessData.dateKey) continue;
      const { _id: _rId, __v: _rV, ...cleanReadiness } = readinessData;
      await DailyReadinessModel.findOneAndUpdate(
        { userId, dateKey: readinessData.dateKey },
        { $set: { ...cleanReadiness, userId } },
        { upsert: true, new: true }
      );
    }

    // Importa Fichas de Musculação
    for (const routineData of strengthRoutines) {
      if (!routineData.name) continue;
      if (mode === 'merge') {
        const exists = await StrengthRoutineModel.findOne({ userId, name: routineData.name });
        if (exists) continue;
      }
      const { _id: _rtId, __v: _rtV, ...cleanRoutine } = routineData;
      await StrengthRoutineModel.create({
        ...cleanRoutine,
        userId,
      });
    }

    // Importa Sessões de Musculação Detalhadas
    for (const ssData of strengthSessions) {
      if (!ssData.startedAt) continue;
      if (mode === 'merge') {
        const exists = await ActiveStrengthSessionModel.findOne({
          userId,
          startedAt: new Date(ssData.startedAt),
        });
        if (exists) continue;
      }
      const { _id: _ssId, __v: _ssV, ...cleanSs } = ssData;
      await ActiveStrengthSessionModel.create({
        ...cleanSs,
        userId,
        startedAt: new Date(ssData.startedAt),
        finishedAt: ssData.finishedAt ? new Date(ssData.finishedAt) : undefined,
      });
    }

    for (const injuryData of injuries) {
      if (!injuryData.region || !injuryData.side || !injuryData.severity) continue;
      const { _id: _injuryId, __v: _injuryVersion, id: _injuryLegacyId, ...cleanInjury } = injuryData;
      await InjuryModel.findOneAndUpdate(
        { userId, region: injuryData.region, side: injuryData.side, occurredAt: injuryData.occurredAt ? new Date(injuryData.occurredAt) : undefined },
        { $set: { ...cleanInjury, userId } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    return {
      success: true,
      mode,
      imported: {
        sessions: importedSessionsCount,
        goals: importedGoalsCount,
        shoes: importedShoesCount,
        physiqueAssessments: importedPhysiqueAssessmentsCount,
        settingsUpdated: !!settings,
      },
    };
  }

  /**
   * Exporta as sessões do atleta para formato CSV (string).
   */
  async exportSessionsCSV(userId: string, startDate?: Date, endDate?: Date): Promise<string> {
    const json = await this.exportSessionsJSON(userId, startDate, endDate);

    if (json.length === 0) {
      return 'id,sportKey,startedAt,durationSeconds,rpe,sessionalLoad,status\n';
    }

    const headers = [
      'id',
      'sportKey',
      'startedAt',
      'endedAt',
      'durationSeconds',
      'rpe',
      'sessionalLoad',
      'status',
      'metrics',
    ];

    const csvRows = [headers.join(',')];

    for (const session of json) {
      const row = [
        session.id,
        session.sportKey,
        new Date(session.startedAt).toISOString(),
        session.endedAt ? new Date(session.endedAt).toISOString() : '',
        session.durationSeconds,
        session.rpe,
        session.sessionalLoad,
        session.status,
        `"${JSON.stringify(session.metrics || {}).replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Gera o relatório semanal (Weekly Report).
   */
  async generateWeeklyReport(userId: string): Promise<WeeklyReportDTO> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const overview = await progressService.getOverview(userId);

    const allGoals = await goalService.listGoals(userId, {});
    const achievedGoals = allGoals.filter((g) => {
      if (g.status !== 'achieved' && g.status !== 'completed') return false;
      const refDate = g.completedAt || g.updatedAt;
      return refDate ? new Date(refDate) >= sevenDaysAgo : false;
    }).length;

    const prsSet = overview.recentPersonalRecords.filter(
      (pr) => new Date(pr.achievedAt) >= sevenDaysAgo
    ).length;

    return {
      weekLabel: 'Últimos 7 Dias',
      startDate: sevenDaysAgo.toISOString(),
      endDate: now.toISOString(),
      acwr: overview.acwr,
      totalDurationSeconds: overview.weeklyTotalDurationSeconds,
      totalSessionalLoad: overview.weeklyTotalSessionalLoad,
      sessionsCount: overview.weeklySessionsCount,
      goalsAchieved: achievedGoals,
      prsSet,
    };
  }
}

export const exportService = new ExportService();
