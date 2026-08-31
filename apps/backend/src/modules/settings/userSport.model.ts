import { Schema, model, Document } from 'mongoose';
import type { UserSportDTO, SportMetricConfig } from '@pacelog/shared';

export interface IUserSport extends Document, Omit<UserSportDTO, 'id' | 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}

const sportMetricConfigSchema = new Schema<SportMetricConfig>(
  {
    metricKey: { type: String, required: true },
    label: { type: String, required: true },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
    isMandatory: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSportSchema = new Schema<IUserSport>(
  {
    userId: { type: String, required: true, index: true },
    sportKey: { type: String, required: true },
    isCustom: { type: Boolean, default: false },
    displayName: { type: String, required: true },
    icon: { type: String, default: 'Activity' },
    color: { type: String, default: '#D4F684' },
    isActive: { type: Boolean, default: true },
    metricsConfig: { type: [sportMetricConfigSchema], default: [] },
  },
  { timestamps: true }
);

userSportSchema.index({ userId: 1, sportKey: 1 }, { unique: true });

export const UserSportModel = model<IUserSport>('UserSport', userSportSchema);
