import type { Request, Response, NextFunction } from 'express';
import { exerciseService } from './exercise.service.js';
import type { ExerciseSearchQuery, CreateCustomExerciseInput } from './strength-session.schemas.js';

export async function searchExercisesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const query = req.query as unknown as ExerciseSearchQuery;
    const result = await exerciseService.searchExercises(userId, query);
    res.status(200).json({
      success: true,
      data: result.items.map((e) => e.toJSON()),
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getExerciseByKeyController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const key = String(Array.isArray(req.params.key) ? req.params.key[0] : req.params.key);
    const exercise = await exerciseService.getExerciseByKey(key);
    res.status(200).json({ success: true, data: exercise.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function createCustomExerciseController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const input = req.body as CreateCustomExerciseInput;
    const exercise = await exerciseService.createCustomExercise(userId, input);
    res.status(201).json({ success: true, data: exercise.toJSON() });
  } catch (error) {
    next(error);
  }
}
