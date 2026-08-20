import type { Request, Response, NextFunction } from 'express';
import { insightService } from './insight.service.js';

export class InsightController {
  getDailyInsight = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const insight = await insightService.getDailyInsight(userId);
      
      res.status(200).json({ data: insight });
    } catch (error) {
      next(error);
    }
  };
}

export const insightController = new InsightController();
