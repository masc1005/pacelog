import type { Request, Response, NextFunction } from 'express';
import { settingsService } from './settings.service.js';
import {
  updateSettingsSchema,
  trainingReminderSchema,
  createCustomSportSchema,
  updateSportMetricsSchema,
} from '@pacelog/shared';

export class SettingsController {
  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId || req.userId!;
      const settings = await settingsService.getSettings(userId);
      res.json(settings);
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId || req.userId!;
      const validated = updateSettingsSchema.parse(req.body);
      const settings = await settingsService.updateSettings(userId, validated as any);
      res.json(settings);
    } catch (error) {
      next(error);
    }
  }

  async addReminder(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId || req.userId!;
      const validated = trainingReminderSchema.parse(req.body);
      const reminders = await settingsService.addReminder(userId, validated);
      res.status(201).json(reminders);
    } catch (error) {
      next(error);
    }
  }

  async deleteReminder(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId || req.userId!;
      const id = String(req.params.id);
      const reminders = await settingsService.deleteReminder(userId, id);
      res.json(reminders);
    } catch (error) {
      next(error);
    }
  }

  async getUserSports(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId || req.userId!;
      const sports = await settingsService.getUserSports(userId);
      res.json(sports);
    } catch (error) {
      next(error);
    }
  }

  async createCustomSport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId || req.userId!;
      const validated = createCustomSportSchema.parse(req.body);
      const sport = await settingsService.createCustomSport(userId, validated);
      res.status(201).json(sport);
    } catch (error) {
      next(error);
    }
  }

  async updateSport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId || req.userId!;
      const sportKey = String(req.params.sportKey);
      const validated = updateSportMetricsSchema.parse(req.body);
      const sport = await settingsService.updateSport(userId, sportKey, validated);
      res.json(sport);
    } catch (error) {
      next(error);
    }
  }

  async restoreSportMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId || req.userId!;
      const sportKey = String(req.params.sportKey);
      const sport = await settingsService.restoreSportMetrics(userId, sportKey);
      res.json(sport);
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();
