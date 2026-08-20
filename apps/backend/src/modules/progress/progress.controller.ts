import type { Request, Response, NextFunction } from 'express';
import { progressService } from './progress.service.js';
import { SPORT_KEYS, type SportKey } from '@pacelog/shared';
import { HttpError } from '../../utils/httpError.js';

export async function getProgressOverviewController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const overview = await progressService.getOverview(userId);

    res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSportProgressController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const sportKey = req.params.sportKey as SportKey;

    if (!SPORT_KEYS.includes(sportKey)) {
      throw new HttpError(400, 'INVALID_SPORT_KEY', { sportKey });
    }

    const weeks = req.query.weeks ? Number(req.query.weeks) : 6;
    const progress = await progressService.getSportProgress(userId, sportKey, weeks);

    res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPersonalRecordsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const prs = await progressService.getPersonalRecords(userId);

    res.status(200).json({
      success: true,
      data: prs,
    });
  } catch (error) {
    next(error);
  }
}
