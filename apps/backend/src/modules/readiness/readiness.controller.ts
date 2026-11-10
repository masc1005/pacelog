import type { Request, Response, NextFunction } from 'express';
import { upsertDailyReadinessSchema } from '@pacelog/shared';
import { dailyReadinessService } from './readiness.service.js';
import { HttpError } from '../../utils/httpError.js';

export async function getReadinessOverviewController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpError(401, 'UNAUTHORIZED');
    }

    const dateKey =
      typeof req.query.dateKey === 'string' ? req.query.dateKey : undefined;
    const overview = await dailyReadinessService.getOverview(userId, dateKey);

    res.status(200).json({ data: overview });
  } catch (err) {
    next(err);
  }
}

export async function upsertReadinessController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpError(401, 'UNAUTHORIZED');
    }

    const parsed = upsertDailyReadinessSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        parsed.error.flatten().fieldErrors
      );
    }

    const saved = await dailyReadinessService.upsertReadiness(
      userId,
      parsed.data
    );
    res.status(200).json({ data: saved });
  } catch (err) {
    next(err);
  }
}
