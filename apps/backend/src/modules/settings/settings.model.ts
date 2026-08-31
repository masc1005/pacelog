import { Schema, model, Document } from 'mongoose';
import type { UserSettingsDTO, TrainingReminder } from '@pacelog/shared';

export interface IUserSettings extends Document, Omit<UserSettingsDTO, 'id' | 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}

const trainingReminderSchema = new Schema<TrainingReminder>(
  {
    id: { type: String, required: true },
    weekday: { type: Number, required: true, min: 0, max: 6 },
    time: { type: String, required: true },
    sportKey: { type: String },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const userSettingsSchema = new Schema<IUserSettings>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    distanceUnit: { type: String, enum: ['km', 'mi'], default: 'km' },
    weightUnit: { type: String, enum: ['kg', 'lb'], default: 'kg' },
    timeFormat: { type: String, enum: ['24h', '12h'], default: '24h' },
    timezone: { type: String, default: 'America/Bahia' },
    language: { type: String, enum: ['pt-BR', 'en-US'], default: 'pt-BR' },
    theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
    weekStart: { type: String, enum: ['monday', 'sunday'], default: 'monday' },
    weeklyVolumeGoalMinutes: { type: Number, default: 240 },
    streakGraceDays: { type: Number, min: 0, max: 3, default: 1 },
    weeklyDigestEnabled: { type: Boolean, default: true },
    notificationsEnabled: { type: Boolean, default: true },
    trainingReminders: { type: [trainingReminderSchema], default: [] },
    achievementNotificationsEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const UserSettingsModel = model<IUserSettings>('UserSettings', userSettingsSchema);
