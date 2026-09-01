import { randomUUID } from 'crypto';
import { ExerciseModel, type IExerciseDocument } from './exercise.model.js';
import { LibraryExerciseNotFoundError } from './strength-session.errors.js';
import type { ExerciseSearchQuery, CreateCustomExerciseInput } from './strength-session.schemas.js';
import { cache } from '../../config/cache.js';

const SYSTEM_CATALOG_KEY = 'exercise_catalog:system';
const USER_CATALOG_PREFIX = 'exercise_catalog:user:';
const SYSTEM_TTL = 60 * 60;       // 60 min — exercícios do sistema raramente mudam
const USER_TTL = 10 * 60;         // 10 min — exercícios custom podem ser criados pelo usuário

export class ExerciseService {
  /**
   * Busca exercícios na biblioteca com filtros e paginação.
   * - Para buscas simples (limit grande, sem texto), usa o cache Redis.
   * - Para buscas com texto/filtros específicos, vai direto ao MongoDB.
   */
  async searchExercises(
    userId: string,
    query: ExerciseSearchQuery
  ): Promise<{
    items: any[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }> {
    // Busca simples do catálogo completo (usado pelo frontend para cache local SWR)
    const isFullCatalogRequest =
      !query.query &&
      !query.muscleGroup &&
      !query.equipment &&
      !query.type &&
      (query.page ?? 1) === 1 &&
      (query.limit ?? 30) >= 100;

    if (isFullCatalogRequest) {
      return this.searchExercisesFromCache(userId, query);
    }

    // Busca com filtros — vai direto ao MongoDB
    return this.searchExercisesFromDB(userId, query);
  }

  /**
   * Busca o catálogo completo usando cache Redis com fallback para o MongoDB.
   */
  private async searchExercisesFromCache(
    userId: string,
    query: ExerciseSearchQuery
  ) {
    const userCacheKey = `${USER_CATALOG_PREFIX}${userId}`;

    // 1. Tenta cache Redis
    try {
      const [cachedSystem, cachedUser] = await Promise.all([
        cache.get(SYSTEM_CATALOG_KEY),
        cache.get(userCacheKey),
      ]);

      if (cachedSystem) {
        const systemItems = JSON.parse(cachedSystem) as any[];
        const userItems = cachedUser ? (JSON.parse(cachedUser) as any[]) : [];
        const allItems = [...systemItems, ...userItems];
        return this.buildPaginatedResult(allItems, query);
      }
    } catch (err) {
      // Redis indisponível — cai direto no MongoDB sem falhar
      console.warn('[ExerciseService] Falha ao ler cache Redis:', (err as Error).message);
    }

    // 2. Cache MISS — busca no MongoDB e escreve no cache
    const result = await this.searchExercisesFromDB(userId, query);
    const systemItems = result.items.filter((e) => e.isSystem);
    const userItems = result.items.filter((e) => !e.isSystem);

    // Popula o cache em background (não bloqueia a resposta)
    Promise.all([
      systemItems.length > 0
        ? cache.set(SYSTEM_CATALOG_KEY, JSON.stringify(systemItems), { ex: SYSTEM_TTL })
        : null,
      userItems.length > 0
        ? cache.set(userCacheKey, JSON.stringify(userItems), { ex: USER_TTL })
        : null,
    ]).catch((err) =>
      console.warn('[ExerciseService] Falha ao gravar cache Redis:', (err as Error).message)
    );

    return result;
  }

  /**
   * Busca direta ao MongoDB com filtros e paginação.
   */
  private async searchExercisesFromDB(
    userId: string,
    query: ExerciseSearchQuery
  ) {
    const filter: Record<string, any> = {
      isActive: true,
      $or: [{ isSystem: true }, { ownerId: userId }],
    };

    if (query.query) {
      filter.$text = { $search: query.query };
    }

    if (query.muscleGroup) {
      filter.primaryMuscleGroup = query.muscleGroup;
    }

    if (query.equipment) {
      filter.equipment = query.equipment;
    }

    if (query.type) {
      filter.type = query.type;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const skip = (page - 1) * limit;

    const sortOptions: Record<string, any> = query.query
      ? { score: { $meta: 'textScore' }, name: 1 }
      : { name: 1 };

    const [total, rawItems] = await Promise.all([
      ExerciseModel.countDocuments(filter),
      ExerciseModel.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    const items = rawItems.map((doc: any) => ({
      ...doc,
      id: doc._id?.toString() ?? doc.id,
    }));

    return this.buildPaginatedResult(items, { ...query, page, limit });
  }

  private buildPaginatedResult(
    items: any[],
    query: ExerciseSearchQuery
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const paginated = items.slice((page - 1) * limit, page * limit);

    return {
      items: paginated,
      pagination: {
        total: items.length,
        page,
        limit,
        pages: Math.ceil(items.length / limit) || 1,
      },
    };
  }

  async getExerciseByKey(key: string): Promise<IExerciseDocument> {
    const exercise = await ExerciseModel.findOne({ key, isActive: true });
    if (!exercise) throw new LibraryExerciseNotFoundError(key);
    return exercise;
  }

  /**
   * Cria um exercício personalizado para o usuário.
   * Invalida o cache do catálogo daquele usuário.
   */
  async createCustomExercise(
    userId: string,
    input: CreateCustomExerciseInput
  ): Promise<IExerciseDocument> {
    const key = `custom_${userId}_${randomUUID()}`;

    const exercise = await ExerciseModel.create({
      key,
      name: input.name,
      primaryMuscleGroup: input.primaryMuscleGroup,
      secondaryMuscleGroups: input.secondaryMuscleGroups ?? [],
      equipment: input.equipment,
      type: input.type ?? 'other',
      isSystem: false,
      ownerId: userId,
      isActive: true,
    });

    // Invalida cache do usuário para forçar recarregamento
    cache
      .del(`${USER_CATALOG_PREFIX}${userId}`)
      .catch((err) =>
        console.warn('[ExerciseService] Falha ao invalidar cache do usuário:', (err as Error).message)
      );

    return exercise;
  }

  /**
   * Seed de exercícios do sistema — chamado no bootstrap da aplicação.
   * Invalida o cache do sistema após seed para refletir atualizações.
   */
  async seedSystemExercises(
    exercises: Array<{
      key: string;
      name: string;
      primaryMuscleGroup: string;
      equipment: string;
      type?: string;
    }>
  ): Promise<void> {
    const ops = exercises.map((ex) => ({
      updateOne: {
        filter: { key: ex.key },
        update: { $set: { ...ex, isSystem: true, isActive: true } },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      await ExerciseModel.bulkWrite(ops);
      // Invalida cache do sistema após cada seed
      cache
        .del(SYSTEM_CATALOG_KEY)
        .catch((err) =>
          console.warn('[ExerciseService] Falha ao invalidar cache do sistema:', (err as Error).message)
        );
    }
  }
}

export const exerciseService = new ExerciseService();
