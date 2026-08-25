import { SessionModel, type ISessionDocument } from './session.model.js';
import {
  enrichSportMetrics,
  calculateSessionalLoad,
} from './sport.rules.js';
import { buildSessionLoad } from '../progress/load/load.service.js';
import type {
  CreateSessionInput,
  UpdateSessionInput,
  ListSessionsQuery,
  SessionSummaryQuery,
} from './session.schemas.js';
import { scopedFilter } from '../../utils/scopedQuery.js';
import { HttpError } from '../../utils/httpError.js';
import { notificationService } from '../notifications/notification.service.js';
import { progressService } from '../progress/progress.service.js';
import { ShoeService } from '../shoes/shoe.service.js';
import type { SessionSummaryDTO, SportKey, SportSummaryStats, RunningMetrics } from '@pacelog/shared';

const shoeService = new ShoeService();

export class SessionService {
  /**
   * Cria ou atualiza (upsert) uma sessão de treino com idempotência offline via clientUuid.
   */
  async createOrUpsertSession(
    userId: string,
    input: CreateSessionInput
  ): Promise<ISessionDocument> {
    // 1. Enriquecer métricas de acordo com o esporte (pace de corrida, volume de musculação, rounds de boxe)
    const enrichedMetrics = enrichSportMetrics(input.sportKey, input.metrics);

    // 2. Determinar a duração total em segundos da sessão
    let durationSeconds: number = Number(input.durationSeconds) || 0;
    if (durationSeconds <= 0) {
      if (enrichedMetrics.durationSeconds) {
        durationSeconds = Number(enrichedMetrics.durationSeconds) || 60;
      } else if (enrichedMetrics.totalDurationSeconds) {
        durationSeconds = Number(enrichedMetrics.totalDurationSeconds) || 60;
      } else {
        durationSeconds = 60; // Fallback mínimo seguro
      }
    }

    // 3. Calcular carga da sessão via helper unificado
    // sessionalLoad (legado) e load.srpe (oficial) sempre têm o mesmo valor
    const loadPayload = buildSessionLoad(input.rpe, durationSeconds, 'completed');

    const sessionPayload: Record<string, any> = {
      userId,
      sportKey: input.sportKey,
      startedAt: input.startedAt || new Date(),
      endedAt: input.endedAt,
      durationSeconds,
      rpe: input.rpe,
      sessionalLoad: loadPayload.sessionalLoad ?? 0,
      load: loadPayload.load,
      status: 'completed' as const,
      metrics: enrichedMetrics,
      notes: input.notes,
    };

    if (input.clientUuid) {
      sessionPayload.clientUuid = input.clientUuid;
    }

    // 4. Se clientUuid estiver presente, fazer Upsert Idempotente para prevenir duplicidade offline
    if (input.clientUuid) {
      const filter = scopedFilter(userId, { clientUuid: input.clientUuid });
      const session = await SessionModel.findOneAndUpdate(
        filter,
        { $set: sessionPayload },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      );
      
      // Disparar hooks assíncronos
      setImmediate(() => {
        this.dispatchAlerts(userId);
      });
      
      return session;
    }

    // 5. Caso contrário, criar nova sessão
    const newSession = await SessionModel.create(sessionPayload);
    
    // 6. Atualizar tênis (se houver)
    if (newSession.sportKey === 'running' && newSession.metrics?.shoeId && newSession.metrics?.distanceMeters) {
      const distanceKm = newSession.metrics.distanceMeters / 1000;
      await shoeService.updateDistanceTransaction(userId, newSession.metrics.shoeId, distanceKm).catch(err => {
        console.error('[SessionService] Failed to update shoe distance:', err);
      });
    }
    
    // Disparar hooks assíncronos
    setImmediate(() => {
      this.dispatchAlerts(userId);
    });

    return newSession;
  }

  private async dispatchAlerts(userId: string) {
    try {
      await notificationService.checkAndDispatchGoalAlerts(userId);
      const overview = await progressService.getOverview(userId);
      await notificationService.checkAndDispatchAcwrAlerts(userId, overview.acwr);
    } catch (error) {
      console.error('[SessionService] Error dispatching alerts:', error);
    }
  }

  /**
   * Lista sessões de treino com paginação e filtros opcionais por modalidade e data.
   */
  async listSessions(
    userId: string,
    query: ListSessionsQuery
  ): Promise<{
    items: ISessionDocument[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    const { page, limit, sportKey, startDate, endDate } = query;

    const baseFilter: Record<string, any> = {};

    if (sportKey) {
      baseFilter.sportKey = sportKey;
    }

    if (startDate || endDate) {
      baseFilter.startedAt = {};
      if (startDate) {
        baseFilter.startedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        baseFilter.startedAt.$lte = new Date(endDate);
      }
    }

    const filter = scopedFilter(userId, baseFilter);
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      SessionModel.countDocuments(filter),
      SessionModel.find(filter)
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Busca uma sessão individual garantindo isolamento multi-tenant.
   */
  async getSessionById(userId: string, sessionId: string): Promise<ISessionDocument> {
    const filter = scopedFilter(userId, { _id: sessionId });
    const session = await SessionModel.findOne(filter);

    if (!session) {
      throw new HttpError(404, 'SESSION_NOT_FOUND', { sessionId });
    }

    return session;
  }

  /**
   * Atualiza uma sessão existente recalculando sessionalLoad e métricas enriquecidas.
   */
  async updateSession(
    userId: string,
    sessionId: string,
    input: UpdateSessionInput
  ): Promise<ISessionDocument> {
    const existingSession = await this.getSessionById(userId, sessionId);
    const oldMetrics = { ...existingSession.metrics };

    if (input.metrics) {
      existingSession.metrics = enrichSportMetrics(
        existingSession.sportKey,
        { ...existingSession.metrics, ...input.metrics }
      );
    }

    if (input.startedAt) existingSession.startedAt = input.startedAt;
    if (input.endedAt !== undefined) existingSession.endedAt = input.endedAt;
    if (input.durationSeconds) existingSession.durationSeconds = input.durationSeconds;
    if (input.rpe) existingSession.rpe = input.rpe;
    if (input.notes !== undefined) existingSession.notes = input.notes;

    // Recalcular carga via helper unificado
    const loadPayload = buildSessionLoad(
      existingSession.rpe,
      existingSession.durationSeconds,
      'completed'
    );
    existingSession.sessionalLoad = loadPayload.sessionalLoad ?? 0;
    (existingSession as any).load = loadPayload.load;

    // Calcular diferença de tênis (Running)
    let shoeUpdatePromise: Promise<void> | null = null;
    if (existingSession.sportKey === 'running') {
      const oldShoeId = (oldMetrics as unknown as RunningMetrics)?.shoeId;
      const oldDistanceMeters = (oldMetrics as unknown as RunningMetrics)?.distanceMeters || 0;
      
      const newShoeId = (existingSession.metrics as unknown as RunningMetrics)?.shoeId;
      const newDistanceMeters = (existingSession.metrics as unknown as RunningMetrics)?.distanceMeters || 0;
      
      const oldDistanceKm = oldDistanceMeters / 1000;
      const newDistanceKm = newDistanceMeters / 1000;

      if (oldShoeId === newShoeId && oldShoeId) {
        // Same shoe, distance changed
        const deltaKm = newDistanceKm - oldDistanceKm;
        if (deltaKm !== 0) {
          shoeUpdatePromise = shoeService.updateDistanceTransaction(userId, oldShoeId, deltaKm);
        }
      } else {
        // Different shoes or shoe removed/added
        const promises = [];
        if (oldShoeId) {
          promises.push(shoeService.updateDistanceTransaction(userId, oldShoeId, -oldDistanceKm));
        }
        if (newShoeId) {
          promises.push(shoeService.updateDistanceTransaction(userId, newShoeId, newDistanceKm));
        }
        if (promises.length > 0) {
          shoeUpdatePromise = Promise.all(promises).then(() => {});
        }
      }
    }

    await existingSession.save();
    
    if (shoeUpdatePromise) {
      await shoeUpdatePromise.catch(err => console.error('[SessionService] Failed to update shoe delta:', err));
    }
    
    // Disparar hooks assíncronos
    setImmediate(() => {
      this.dispatchAlerts(userId);
    });

    return existingSession;
  }

  /**
   * Exclui uma sessão garantindo isolamento multi-tenant.
   */
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const filter = scopedFilter(userId, { _id: sessionId });
    const session = await SessionModel.findOne(filter);
    
    if (!session) {
      throw new HttpError(404, 'SESSION_NOT_FOUND', { sessionId });
    }

    if (session.sportKey === 'running' && session.metrics?.shoeId && session.metrics?.distanceMeters) {
      const distanceKm = session.metrics.distanceMeters / 1000;
      await shoeService.updateDistanceTransaction(userId, session.metrics.shoeId, -distanceKm).catch(err => {
        console.error('[SessionService] Failed to revert shoe distance:', err);
      });
    }

    await SessionModel.deleteOne(filter);
  }

  /**
   * Gera resumo agregado da telemetria de treinos para o Dashboard e Telas de Progresso.
   */
  async getSessionSummary(
    userId: string,
    query: SessionSummaryQuery
  ): Promise<SessionSummaryDTO> {
    const { timeframe } = query;
    const now = new Date();
    let startDate: Date | null = null;

    if (timeframe === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeframe === 'year') {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    const matchStage: Record<string, any> = { userId };
    if (startDate) {
      matchStage.startedAt = { $gte: startDate };
    }

    const aggregation = await SessionModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$sportKey',
          totalSessions: { $sum: 1 },
          totalDurationSeconds: { $sum: '$durationSeconds' },
          totalSessionalLoad: { $sum: '$sessionalLoad' },
          totalRpe: { $sum: '$rpe' },
        },
      },
    ]);

    let totalSessions = 0;
    let totalDurationSeconds = 0;
    let totalSessionalLoad = 0;
    let totalRpeSum = 0;

    const bySport: SportSummaryStats[] = aggregation.map((item) => {
      totalSessions += item.totalSessions;
      totalDurationSeconds += item.totalDurationSeconds;
      totalSessionalLoad += item.totalSessionalLoad;
      totalRpeSum += item.totalRpe;

      return {
        sportKey: item._id as SportKey,
        totalSessions: item.totalSessions,
        totalDurationSeconds: item.totalDurationSeconds,
        totalSessionalLoad: item.totalSessionalLoad,
      };
    });

    const averageRpe =
      totalSessions > 0 ? Math.round((totalRpeSum / totalSessions) * 10) / 10 : 0;

    // Cálculo simples de streak de dias únicos
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

    const streakDays = uniqueDaysAgg.length;

    return {
      totalSessions,
      totalDurationSeconds,
      totalSessionalLoad,
      averageRpe,
      streakDays,
      bySport,
    };
  }
}

export const sessionService = new SessionService();
