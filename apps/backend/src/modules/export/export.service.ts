import { SessionModel } from '../sessions/session.model.js';
import { GoalModel } from '../goals/goal.model.js';
import { ShoeModel } from '../shoes/shoe.model.js';
import { ProfileModel } from '../profile/profile.model.js';
import { UserSettingsModel } from '../settings/settings.model.js';
import { UserSportModel } from '../settings/userSport.model.js';
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
   * Exporta um backup completo com perfil, configurações, sessões, metas e tênis.
   */
  async exportBackupJSON(userId: string) {
    const [profile, settings, userSports, sessions, goals, shoes] = await Promise.all([
      ProfileModel.findOne(scopedFilter(userId)).lean(),
      UserSettingsModel.findOne({ userId }).lean(),
      UserSportModel.find({ userId }).lean(),
      SessionModel.find(scopedFilter(userId)).sort({ startedAt: -1 }).lean(),
      GoalModel.find(scopedFilter(userId)).lean(),
      ShoeModel.find(scopedFilter(userId)).lean(),
    ]);

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      profile: profile ? { ...profile, _id: undefined, __v: undefined } : null,
      settings: settings ? { ...settings, _id: undefined, __v: undefined } : null,
      userSports: userSports.map((s: any) => ({ ...s, _id: undefined, __v: undefined })),
      sessions: sessions.map((s: any) => ({ ...s, _id: undefined, __v: undefined })),
      goals: goals.map((g: any) => ({ ...g, _id: undefined, __v: undefined })),
      shoes: shoes.map((sh: any) => ({ ...sh, _id: undefined, __v: undefined })),
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
        settings?: any;
        profile?: any;
        userSports?: any[] | null;
      };
    }
  ) {
    const mode = backupData.mode || 'merge';
    const sessions = backupData.data.sessions || [];
    const goals = backupData.data.goals || [];
    const shoes = backupData.data.shoes || [];
    const { settings, profile } = backupData.data;

    let importedSessionsCount = 0;
    let importedGoalsCount = 0;
    let importedShoesCount = 0;

    // Se o modo for REPLACE, limpa dados anteriores do usuário
    if (mode === 'replace') {
      await Promise.all([
        SessionModel.deleteMany({ userId }),
        GoalModel.deleteMany({ userId }),
        ShoeModel.deleteMany({ userId }),
      ]);
    }

    // Importa/Atualiza Settings se fornecido
    if (settings) {
      await UserSettingsModel.findOneAndUpdate(
        { userId },
        { $set: { ...settings, userId } },
        { upsert: true, new: true }
      );
    }

    // Importa/Atualiza Profile se fornecido
    if (profile) {
      await ProfileModel.findOneAndUpdate(
        { userId },
        { $set: { ...profile, userId } },
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

      await SessionModel.create({
        ...sessionData,
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
      await GoalModel.create({
        ...goalData,
        userId,
        targetDate: goalData.targetDate ? new Date(goalData.targetDate) : undefined,
      });
      importedGoalsCount++;
    }

    // Importa Tênis
    for (const shoeData of shoes) {
      if (!shoeData.name) continue;
      if (mode === 'merge') {
        const exists = await ShoeModel.findOne({ userId, name: shoeData.name });
        if (exists) continue;
      }
      await ShoeModel.create({
        ...shoeData,
        userId,
        purchasedAt: shoeData.purchasedAt ? new Date(shoeData.purchasedAt) : undefined,
      });
      importedShoesCount++;
    }

    return {
      success: true,
      mode,
      imported: {
        sessions: importedSessionsCount,
        goals: importedGoalsCount,
        shoes: importedShoesCount,
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

    const headers = ['id', 'sportKey', 'startedAt', 'endedAt', 'durationSeconds', 'rpe', 'sessionalLoad', 'status', 'metrics'];

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
    const achievedGoals = allGoals.filter(
      (g) => g.status === 'achieved' && g.updatedAt && new Date(g.updatedAt) >= sevenDaysAgo
    ).length;

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
