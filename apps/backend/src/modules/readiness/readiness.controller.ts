import type { Request, Response, NextFunction } from 'express';
import { dailyReadinessService } from './readiness.service.js';
import type { UpsertDailyReadinessInput } from '@pacelog/shared';

export async function getReadinessOverviewController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const dateKey =
      typeof req.query.dateKey === 'string' ? req.query.dateKey : undefined;
    const overview = await dailyReadinessService.getOverview(userId, dateKey);

    res.status(200).json({
      success: true,
      data: {
        today: overview.today ? overview.today.toJSON() : null,
        history: overview.history.map((h) => h.toJSON()),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function upsertReadinessController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const input = req.body as UpsertDailyReadinessInput;
    const saved = await dailyReadinessService.upsertReadiness(userId, input);

    res.status(200).json({
      success: true,
      data: saved.toJSON(),
    });
  } catch (error) {
    next(error);
  }
}
