import type { Request, Response, NextFunction } from 'express';
import { weeklyScheduleService } from './schedule.service.js';
import type {
  UpdateWeeklyScheduleDayInput,
  UpdateWeeklyScheduleInput,
} from '@pacelog/shared';

export async function getScheduleController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const schedule = await weeklyScheduleService.getSchedule(userId);
    res.status(200).json({
      success: true,
      data: schedule.toJSON(),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateScheduleDayController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const input = req.body as UpdateWeeklyScheduleDayInput;
    const schedule = await weeklyScheduleService.updateDay(userId, input);
    res.status(200).json({
      success: true,
      data: schedule.toJSON(),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateFullScheduleController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const input = req.body as UpdateWeeklyScheduleInput;
    const schedule = await weeklyScheduleService.updateFullSchedule(userId, input);
    res.status(200).json({
      success: true,
      data: schedule.toJSON(),
    });
  } catch (error) {
    next(error);
  }
}
