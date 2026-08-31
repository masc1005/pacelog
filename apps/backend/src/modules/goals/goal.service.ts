import { GoalModel, type IGoalDocument } from './goal.model.js';
import { SessionModel } from '../sessions/session.model.js';
import {
  resolveGoalTimeWindow,
  calculateGoalProgress,
  mapGoalToDTO,
  resolveMetricType,
  getDefaultUnitForMetric,
  type SessionDataForGoal,
} from './goal.rules.js';
import type {
  CreateGoalInput,
  UpdateGoalInput,
  ListGoalsQuery,
} from './goal.schemas.js';
import { scopedFilter } from '../../utils/scopedQuery.js';
import { HttpError } from '../../utils/httpError.js';
import type { GoalDTO, GoalStatus, GoalMetricType, GoalDirection } from '@pacelog/shared';

export class GoalService {
  /**
   * Cria uma nova meta de treino para o atleta autenticado com suporte a idempotência e baseline.
   */
  async createGoal(userId: string, input: CreateGoalInput): Promise<GoalDTO> {
    // Idempotência por clientUuid (offline-first)
    if (input.clientUuid) {
      const existing = await GoalModel.findOne({ userId, clientUuid: input.clientUuid });
      if (existing) {
        return this.enrichSingleGoal(userId, existing);
      }
    }

    const metricType: GoalMetricType = resolveMetricType({
      metricType: input.metricType,
      type: input.type,
      sportKey: input.sportKey,
    });

    const direction: GoalDirection =
      input.direction || (metricType === 'average_pace_seconds_per_km' ? 'decrease' : 'increase');

    const unit = input.unit || getDefaultUnitForMetric(metricType, input.sportKey);

    // Auto-captura de baseline startValue para métricas de redução (pace)
    let startValue = input.startValue;
    if (direction === 'decrease' && startValue === undefined) {
      const recentSession = await SessionModel.findOne({
        userId,
        sportKey: input.sportKey || 'running',
        'metrics.paceSecondsPerKm': { $gt: 0 },
      })
        .sort({ startedAt: -1 })
        .exec();

      if (recentSession?.metrics?.paceSecondsPerKm) {
        startValue = recentSession.metrics.paceSecondsPerKm;
      }
    }

    // Auto-geração de título se não fornecido
    const title = input.title?.trim() || this.generateDefaultTitle(metricType, input.targetValue, unit, input.sportKey);

    const goal = await GoalModel.create({
      userId,
      clientUuid: input.clientUuid,
      title,
      scope: input.scope || (input.sportKey ? 'sport' : 'overall'),
      sportKey: input.sportKey || null,
      metricType,
      direction,
      type: input.type,
      targetValue: input.targetValue,
      startValue,
      unit,
      period: input.period || 'weekly',
      startDate: input.startDate || new Date(),
      deadline: input.deadline,
      notes: input.notes,
      status: 'active',
      celebrationShown: false,
    });

    return this.enrichSingleGoal(userId, goal);
  }

  /**
   * Lista as metas do atleta calculando o progresso de forma otimizada (sem N+1 queries).
   */
  async listGoals(userId: string, query: ListGoalsQuery): Promise<GoalDTO[]> {
    const filter: Record<string, any> = {};
    if (query.status) {
      if (query.status === 'completed') {
        filter.status = { $in: ['completed', 'achieved'] };
      } else {
        filter.status = query.status;
      }
    }
    if (query.sportKey) filter.sportKey = query.sportKey;
    if (query.scope) filter.scope = query.scope;
    if (query.period) filter.period = query.period;

    const goals = await GoalModel.find(scopedFilter(userId, filter))
      .sort({ createdAt: -1 })
      .exec();

    if (goals.length === 0) return [];

    // Determina a data mais antiga necessária entre todas as metas para busca em lote
    const earliestDate = goals.reduce((oldest, g) => {
      const windowStart = resolveGoalTimeWindow(g.period, g.startDate);
      return windowStart < oldest ? windowStart : oldest;
    }, new Date());

    const allSessions = await SessionModel.find({
      userId,
      startedAt: { $gte: earliestDate },
    })
      .lean<SessionDataForGoal[]>()
      .exec();

    const now = new Date();

    return goals.map((goal) => {
      const windowStart = resolveGoalTimeWindow(goal.period, goal.startDate);
      const goalSessions = allSessions.filter((s) => {
        const d = new Date(s.startedAt);
        if (d < windowStart) return false;
        if (goal.deadline && d > new Date(goal.deadline)) return false;
        return true;
      });

      const progress = calculateGoalProgress(goal, goalSessions);

      // Auto-expiração ou auto-conclusão persistida
      if (goal.deadline && new Date(goal.deadline) < now && !progress.isAchieved && goal.status === 'active') {
        GoalModel.updateOne({ _id: goal._id }, { $set: { status: 'expired' } }).exec();
      } else if (progress.isAchieved && goal.status === 'active') {
        GoalModel.updateOne({ _id: goal._id }, { $set: { status: 'completed', completedAt: new Date() } }).exec();
      }

      return mapGoalToDTO(goal, progress);
    });
  }

  /**
   * Busca uma meta específica com progresso detalhado e histórico de sessões.
   */
  async getGoalById(userId: string, goalId: string): Promise<GoalDTO> {
    const goal = await this.findGoalOrThrow(userId, goalId);
    return this.enrichSingleGoal(userId, goal);
  }

  /**
   * Atualiza uma meta existente.
   */
  async updateGoal(
    userId: string,
    goalId: string,
    input: UpdateGoalInput
  ): Promise<GoalDTO> {
    const goal = await this.findGoalOrThrow(userId, goalId);

    if (input.title !== undefined) goal.title = input.title;
    if (input.targetValue !== undefined) goal.targetValue = input.targetValue;
    if (input.unit !== undefined) goal.unit = input.unit;
    if (input.deadline !== undefined) goal.deadline = input.deadline || undefined;
    if (input.notes !== undefined) goal.notes = input.notes || undefined;
    if (input.celebrationShown !== undefined) goal.celebrationShown = input.celebrationShown;

    if (input.status !== undefined) {
      goal.status = input.status as GoalStatus;
      if (input.status === 'completed' || input.status === 'achieved') {
        goal.completedAt = new Date();
      } else if (input.status === 'paused') {
        goal.pausedAt = new Date();
      } else if (input.status === 'active') {
        goal.pausedAt = undefined;
      }
    }

    await goal.save();
    return this.enrichSingleGoal(userId, goal);
  }

  /**
   * Pausa uma meta ativa.
   */
  async pauseGoal(userId: string, goalId: string): Promise<GoalDTO> {
    return this.updateGoal(userId, goalId, { status: 'paused' });
  }

  /**
   * Retoma uma meta pausada.
   */
  async resumeGoal(userId: string, goalId: string): Promise<GoalDTO> {
    return this.updateGoal(userId, goalId, { status: 'active' });
  }

  /**
   * Conclui manualmente uma meta antes do alvo.
   */
  async completeGoal(userId: string, goalId: string): Promise<GoalDTO> {
    return this.updateGoal(userId, goalId, { status: 'completed' });
  }

  /**
   * Exclui uma meta garantindo isolamento multi-tenant.
   */
  async deleteGoal(userId: string, goalId: string): Promise<void> {
    const result = await GoalModel.findOneAndDelete(scopedFilter(userId, { _id: goalId }));
    if (!result) {
      throw new HttpError(404, 'GOAL_NOT_FOUND', { goalId });
    }
  }

  /**
   * Auxiliar para buscar meta garantindo tenant e lançando erro 404 padronizado.
   */
  private async findGoalOrThrow(userId: string, goalId: string): Promise<IGoalDocument> {
    const goal = await GoalModel.findOne(scopedFilter(userId, { _id: goalId }));
    if (!goal) {
      throw new HttpError(404, 'GOAL_NOT_FOUND', { goalId });
    }
    return goal;
  }

  /**
   * Enriquece uma meta individual com as sessões correspondentes.
   */
  private async enrichSingleGoal(userId: string, goal: IGoalDocument): Promise<GoalDTO> {
    const windowStart = resolveGoalTimeWindow(goal.period, goal.startDate);
    const sessionMatch: Record<string, any> = {
      userId,
      startedAt: { $gte: windowStart },
    };

    if (goal.deadline) {
      sessionMatch.startedAt.$lte = new Date(goal.deadline);
    }

    if (goal.scope === 'sport' && goal.sportKey) {
      sessionMatch.sportKey = goal.sportKey;
    }

    const sessions = await SessionModel.find(sessionMatch).lean<SessionDataForGoal[]>().exec();
    const progress = calculateGoalProgress(goal, sessions);

    if (progress.isAchieved && goal.status === 'active') {
      GoalModel.updateOne({ _id: goal._id }, { $set: { status: 'completed', completedAt: new Date() } }).exec();
    }

    return mapGoalToDTO(goal, progress);
  }


  /**
   * Gera um título padrão amigável para a meta.
   */
  private generateDefaultTitle(
    metricType: GoalMetricType,
    targetValue: number,
    unit: string,
    sportKey?: string | null
  ): string {
    const sportName = sportKey ? sportKey.charAt(0).toUpperCase() + sportKey.slice(1) : 'Geral';
    switch (metricType) {
      case 'distance_km':
        return `${sportName} · ${targetValue} km`;
      case 'duration_minutes':
        return `${sportName} · ${targetValue} min`;
      case 'sessions_count':
        return `${sportName} · ${targetValue} treinos`;
      case 'rounds_count':
        return `${sportName} · ${targetValue} ${unit}`;
      case 'volume_kg':
        return `${sportName} · ${targetValue} kg de volume`;
      case 'weight_kg':
        return `${sportName} · Carga ${targetValue} kg`;
      case 'average_speed_kmh':
        return `${sportName} · Velocidade ${targetValue} km/h`;
      case 'average_pace_seconds_per_km': {
        const min = Math.floor(targetValue / 60);
        const sec = Math.round(targetValue % 60);
        return `${sportName} · Pace ${min}:${sec.toString().padStart(2, '0')}/km`;
      }
      case 'streak_days':
        return `${sportName} · ${targetValue} dias de consistência`;
      default:
        return `${sportName} · Alvo ${targetValue} ${unit}`;
    }
  }
}

export const goalService = new GoalService();
