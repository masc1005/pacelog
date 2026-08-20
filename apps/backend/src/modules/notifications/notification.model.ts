import mongoose, { Schema, Document } from 'mongoose';
import { NotificationType, NOTIFICATION_TYPES } from '@pacelog/shared';

export interface INotification extends Document {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, any>;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Índices para busca otimizada (lista de notificações não lidas e histórico)
NotificationSchema.index({ userId: 1, readAt: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
// TTL de 30 dias: exclui notificações antigas automaticamente
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
