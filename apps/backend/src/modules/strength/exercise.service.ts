import { randomUUID } from 'crypto';
import { ExerciseModel, type IExerciseDocument } from './exercise.model.js';
import { LibraryExerciseNotFoundError } from './strength-session.errors.js';
import type { ExerciseSearchQuery, CreateCustomExerciseInput } from './strength-session.schemas.js';

export class ExerciseService {
  /**
   * Busca exercícios na biblioteca com filtros e paginação.
   * Inclui exercícios do sistema e personalizados do usuário.
   */
  async searchExercises(
    userId: string,
    query: ExerciseSearchQuery
  ): Promise<{
    items: any[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }> {
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

  async getExerciseByKey(key: string): Promise<IExerciseDocument> {
    const exercise = await ExerciseModel.findOne({ key, isActive: true });
    if (!exercise) throw new LibraryExerciseNotFoundError(key);
    return exercise;
  }

  /**
   * Cria um exercício personalizado para o usuário.
   */
  async createCustomExercise(
    userId: string,
    input: CreateCustomExerciseInput
  ): Promise<IExerciseDocument> {
    const key = `custom_${userId}_${randomUUID()}`;

    return ExerciseModel.create({
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
  }

  /**
   * Seed de exercícios do sistema — chamado no bootstrap da aplicação.
   * Usa upsert por key para ser idempotente.
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
    }
  }
}

export const exerciseService = new ExerciseService();
