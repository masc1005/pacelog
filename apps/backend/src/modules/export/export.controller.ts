import type { Request, Response, NextFunction } from 'express';
import { exportService } from './export.service.js';

export class ExportController {
  exportSessionsCSV = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { from, to } = req.query;
      
      const startDate = from ? new Date(String(from)) : undefined;
      const endDate = to ? new Date(String(to)) : undefined;
      
      const csv = await exportService.exportSessionsCSV(userId, startDate, endDate);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sessions.csv"');
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  };

  exportSessionsJSON = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { from, to } = req.query;
      
      const startDate = from ? new Date(String(from)) : undefined;
      const endDate = to ? new Date(String(to)) : undefined;
      
      const json = await exportService.exportSessionsJSON(userId, startDate, endDate);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="sessions.json"');
      res.status(200).json(json);
    } catch (error) {
      next(error);
    }
  };

  getWeeklyReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const report = await exportService.generateWeeklyReport(userId);
      
      res.status(200).json({ data: report });
    } catch (error) {
      next(error);
    }
  };
}

export const exportController = new ExportController();
