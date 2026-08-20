import type { Request, Response, NextFunction } from 'express';
import { notificationService } from './notification.service.js';

export class NotificationController {
  listNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const notifications = await notificationService.listNotifications(userId);
      const unreadCount = await notificationService.getUnreadCount(userId);
      
      res.status(200).json({
        data: notifications,
        meta: {
          unreadCount
        }
      });
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { ids } = req.body;
      
      if (!Array.isArray(ids)) {
        res.status(400).json({ error: 'ids must be an array of strings' });
        return;
      }

      await notificationService.markAsRead(userId, ids);
      res.status(200).json({ message: 'Notifications marked as read' });
    } catch (error) {
      next(error);
    }
  };

  deleteNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const id = String(req.params.id);
      
      await notificationService.deleteNotification(userId, id);
      res.status(200).json({ message: 'Notification deleted' });
    } catch (error) {
      next(error);
    }
  };
  
  checkAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      
      // Check streak alerts (async background is fine, but we'll await it for testing)
      await notificationService.checkStreakAlerts(userId);
      // Goals alerts
      await notificationService.checkAndDispatchGoalAlerts(userId);
      
      res.status(200).json({ message: 'Alerts checked' });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
