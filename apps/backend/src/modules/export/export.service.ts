import { SessionModel } from '../sessions/session.model.js';
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

    return sessions.map(s => {
      const { _id, __v, userId: _, ...rest } = s as any;
      return { id: _id.toString(), ...rest };
    });
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
        `"${JSON.stringify(session.metrics || {}).replace(/"/g, '""')}"`
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
    
    // Obtemos o overview que já tem acwr, e totais da semana
    const overview = await progressService.getOverview(userId);
    
    // Contar metas alcançadas nos últimos 7 dias
    const allGoals = await goalService.listGoals(userId, {});
    const achievedGoals = allGoals.filter(g => 
      g.status === 'achieved' && 
      g.updatedAt && 
      new Date(g.updatedAt) >= sevenDaysAgo
    ).length;

    // Contar PRs batidos nos últimos 7 dias
    const prsSet = overview.recentPersonalRecords.filter(pr => 
      new Date(pr.achievedAt) >= sevenDaysAgo
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
      prsSet
    };
  }
}

export const exportService = new ExportService();
