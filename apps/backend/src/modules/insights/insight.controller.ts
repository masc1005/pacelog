import type { Request, Response, NextFunction } from 'express';
import { insightService } from './insight.service.js';

export class InsightController {
  getDailyInsight = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const force = req.query.force === 'true';
      const insight = await insightService.getDailyInsight(userId, force);
      
      res.status(200).json({ data: insight });
    } catch (error) {
      next(error);
    }
  };

  getSessionInsight = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const sessionId = String(req.params.sessionId);
      const insight = await insightService.getExistingSessionInsight(userId, sessionId);
      
      if (!insight) {
        res.status(404).json({ success: false, message: 'Insight not generated yet' });
        return;
      }
      
      res.status(200).json({ data: insight });
    } catch (error) {
      next(error);
    }
  };

  generateSessionInsight = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const sessionId = String(req.params.sessionId);
      const force = req.query.force === 'true';

      if (force) {
        const { InsightModel } = await import('./insight.model.js');
        await InsightModel.deleteOne({ userId, sessionId, type: 'session_analysis' });
      }

      const insight = await insightService.getSessionComparisonInsight(userId, sessionId);
      
      res.status(200).json({ data: insight });
    } catch (error) {
      next(error);
    }
  };

  listInsights = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { InsightModel } = await import('./insight.model.js');
      
      const insights = await InsightModel.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50);
        
      // Map to DTO manually here to avoid exposing Mongoose documents directly
      const mappedInsights = insights.map(i => ({
        id: i._id.toString(),
        userId: i.userId,
        sessionId: i.sessionId,
        content: i.content,
        type: i.type,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt
      }));
      
      res.status(200).json({ data: mappedInsights });
    } catch (error) {
      next(error);
    }
  };
}

export const insightController = new InsightController();
