import type { Request, Response, NextFunction } from 'express';
import { goalService } from './goal.service.js';
import type {
  CreateGoalInput,
  UpdateGoalInput,
  ListGoalsQuery,
} from './goal.schemas.js';

export async function createGoalController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const input = req.body as CreateGoalInput;

    const goal = await goalService.createGoal(userId, input);

    res.status(201).json({
      success: true,
      data: goal,
    });
  } catch (error) {
    next(error);
  }
}

export async function listGoalsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const query = req.query as unknown as ListGoalsQuery;

    const goals = await goalService.listGoals(userId, query);

    res.status(200).json({
      success: true,
      data: goals,
    });
  } catch (error) {
    next(error);
  }
}

export async function getGoalByIdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);

    const goal = await goalService.getGoalById(userId, id);

    res.status(200).json({
      success: true,
      data: goal,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateGoalController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);
    const input = req.body as UpdateGoalInput;

    const goal = await goalService.updateGoal(userId, id, input);

    res.status(200).json({
      success: true,
      data: goal,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteGoalController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);

    await goalService.deleteGoal(userId, id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
