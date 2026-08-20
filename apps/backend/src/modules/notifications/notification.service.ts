import { Notification } from './notification.model.js';
import { goalService } from '../goals/goal.service.js';
import { SessionModel } from '../sessions/session.model.js';
import type { AcwrReadout } from '@pacelog/shared';

export class NotificationService {
  async checkAndDispatchGoalAlerts(userId: string) {
    const goals = await goalService.listGoals(userId, { status: 'active' });
    
    for (const goal of goals) {
      if (goal.status === 'achieved' || goal.progressPercent >= 100) {
        const exists = await Notification.exists({ userId, type: 'goal_achieved', 'payload.goalId': goal.id });
        if (!exists) {
          await Notification.create({
            userId,
            type: 'goal_achieved',
            title: 'Meta Alcançada! 🏆',
            body: `Parabéns! Você completou a meta "${goal.title}".`,
            payload: { goalId: goal.id, sportKey: goal.sportKey }
          });
        }
      }
    }
  }

  async checkAndDispatchAcwrAlerts(userId: string, acwr: AcwrReadout) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (acwr.status === 'danger_zone') {
      const exists = await Notification.exists({ 
        userId, 
        type: 'acwr_danger', 
        createdAt: { $gte: today } 
      });
      
      if (!exists) {
        await Notification.create({
          userId,
          type: 'acwr_danger',
          title: 'Alerta Fisiológico: Danger Zone ⚠️',
          body: 'Seu aumento de carga está muito alto (ACWR > 1.5). Risco elevado de lesão. Considere descanso.',
          payload: { ratio: acwr.ratio }
        });
      }
    } else if (acwr.status === 'over-reaching') {
      const exists = await Notification.exists({ 
        userId, 
        type: 'acwr_warning', 
        createdAt: { $gte: today } 
      });
      
      if (!exists) {
        await Notification.create({
          userId,
          type: 'acwr_warning',
          title: 'Atenção: Sobrecarga (Over-reaching) ⚡',
          body: 'Seu corpo está sob estresse (ACWR > 1.3). Monitore a recuperação.',
          payload: { ratio: acwr.ratio }
        });
      }
    }
  }

  async checkStreakAlerts(userId: string) {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    const recentSession = await SessionModel.findOne({
      userId,
      startedAt: { $gte: twoDaysAgo }
    });

    if (!recentSession) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const exists = await Notification.exists({
        userId,
        type: 'streak_broken',
        createdAt: { $gte: oneWeekAgo }
      });
      
      if (!exists) {
         await Notification.create({
          userId,
          type: 'streak_broken',
          title: 'Quebra de Ritmo 📉',
          body: 'Você está há mais de 2 dias sem treinar. Que tal uma sessão leve para manter o hábito?',
          payload: {}
        });
      }
    }
  }

  async listNotifications(userId: string) {
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();
      
    return notifications.map(n => ({
      id: n._id.toString(),
      userId: n.userId,
      type: n.type,
      title: n.title,
      body: n.body,
      payload: n.payload,
      readAt: n.readAt,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt
    }));
  }

  async getUnreadCount(userId: string) {
    return Notification.countDocuments({ userId, readAt: null });
  }

  async markAsRead(userId: string, ids: string[]) {
    await Notification.updateMany(
      { userId, _id: { $in: ids }, readAt: null },
      { $set: { readAt: new Date() } }
    );
  }
  
  async deleteNotification(userId: string, id: string) {
    await Notification.findOneAndDelete({ userId, _id: id });
  }
}

export const notificationService = new NotificationService();
