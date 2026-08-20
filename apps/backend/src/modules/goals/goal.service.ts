import { GoalModel, type IGoalDocument } from './goal.model.js';
import { SessionModel } from '../sessions/session.model.js';
import {
  resolveGoalTimeWindow,
  calculateGoalProgress,
  mapGoalToDTO,
  type SessionDataForGoal,
} from './goal.rules.js';
import type {
  CreateGoalInput,
  UpdateGoalInput,
  ListGoalsQuery,
} from './goal.schemas.js';
import { scopedFilter } from '../../utils/scopedQuery.js';
import { HttpError } from '../../utils/httpError.js';
import type { GoalDTO, GoalStatus } from '@pacelog/shared';

export class GoalService {
  /**
   * Cria uma nova meta de treino para o atleta autenticado.
   */
  async createGoal(userId: string, input: CreateGoalInput): Promise<GoalDTO> {
    const goal = await GoalModel.create({
      userId,
      title: input.title,
      type: input.type,
      sportKey: input.sportKey || null,
      targetValue: input.targetValue,
      unit: input.unit,
      period: input.period,
      startDate: input.startDate || new Date(),
      deadline: input.deadline,
      notes: input.notes,
      status: 'active',
    });

    return this.enrichSingleGoal(userId, goal);
  }

  /**
   * Lista as metas do atleta calculando o progresso de forma otimizada (sem N+1 queries).
   */
  async listGoals(userId: string, query: ListGoalsQuery): Promise<GoalDTO[]> {
    const filter: Record<string, any> = {};
    if (query.status) filter.status = query.status;
    if (query.sportKey) filter.sportKey = query.sportKey;
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

    return goals.map((goal) => {
      const windowStart = resolveGoalTimeWindow(goal.period, goal.startDate);
      const goalSessions = allSessions.filter(
        (s) => new Date(s.startedAt) >= windowStart
      );

      const progress = calculateGoalProgress(goal, goalSessions);
      if (progress.isAchieved && goal.status === 'active') {
        GoalModel.updateOne({ _id: goal._id }, { $set: { status: 'achieved' } }).exec();
      }

      return mapGoalToDTO(goal, progress);
    });
  }

  /**
   * Busca uma meta específica com progresso calculado.
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
    if (input.status !== undefined) goal.status = input.status as GoalStatus;
    if (input.deadline !== undefined) goal.deadline = input.deadline || undefined;
    if (input.notes !== undefined) goal.notes = input.notes;

    await goal.save();
    return this.enrichSingleGoal(userId, goal);
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

    if (goal.sportKey) {
      sessionMatch.sportKey = goal.sportKey;
    }

    const sessions = await SessionModel.find(sessionMatch).lean<SessionDataForGoal[]>().exec();
    const progress = calculateGoalProgress(goal, sessions);

    if (progress.isAchieved && goal.status === 'active') {
      GoalModel.updateOne({ _id: goal._id }, { $set: { status: 'achieved' } }).exec();
    }

    return mapGoalToDTO(goal, progress);
  }
}

export const goalService = new GoalService();
