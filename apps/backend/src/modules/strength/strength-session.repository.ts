import {
  ActiveStrengthSessionModel,
  type IActiveStrengthSessionDocument,
} from './strength-session.model.js';
import {
  StrengthSessionNotFoundError,
  StrengthSessionAlreadyActiveError,
} from './strength-session.errors.js';

export class StrengthSessionRepository {
  /**
   * Encontra a sessão ativa (active | paused | finishing) de um usuário.
   * Retorna null se não houver sessão em andamento.
   */
  async findActive(userId: string): Promise<IActiveStrengthSessionDocument | null> {
    return ActiveStrengthSessionModel.findOne({
      userId,
      status: { $in: ['active', 'paused', 'finishing'] },
    });
  }

  /**
   * Garante que não existe sessão ativa antes de criar uma nova.
   */
  async assertNoActiveSession(userId: string): Promise<void> {
    const existing = await this.findActive(userId);
    if (existing) {
      throw new StrengthSessionAlreadyActiveError();
    }
  }

  /**
   * Busca uma sessão por ID, garantindo que pertence ao usuário.
   */
  async findByIdOrFail(
    userId: string,
    sessionId: string
  ): Promise<IActiveStrengthSessionDocument> {
    const session = await ActiveStrengthSessionModel.findOne({
      _id: sessionId,
      userId,
    });
    if (!session) {
      throw new StrengthSessionNotFoundError(sessionId);
    }
    return session;
  }

  /**
   * Lista sessões concluídas (histórico) com paginação.
   */
  async listCompleted(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{
    items: IActiveStrengthSessionDocument[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }> {
    const filter = { userId, status: 'completed' };
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      ActiveStrengthSessionModel.countDocuments(filter),
      ActiveStrengthSessionModel.find(filter)
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
   * Verifica se uma operação já foi processada (idempotência).
   */
  isOperationProcessed(
    session: IActiveStrengthSessionDocument,
    operationId: string
  ): boolean {
    return session.processedOperationIds.includes(operationId);
  }

  /**
   * Marca operação como processada e salva a sessão.
   * Mantém no máximo 200 IDs para não crescer indefinidamente.
   */
  async markOperationAndSave(
    session: IActiveStrengthSessionDocument,
    operationId: string
  ): Promise<IActiveStrengthSessionDocument> {
    if (!session.processedOperationIds.includes(operationId)) {
      session.processedOperationIds.push(operationId);
      if (session.processedOperationIds.length > 200) {
        session.processedOperationIds = session.processedOperationIds.slice(-200);
      }
    }
    session.lastActivityAt = new Date();
    return session.save();
  }
}

export const strengthSessionRepository = new StrengthSessionRepository();
