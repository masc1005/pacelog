import mongoose, { Document, Schema } from 'mongoose';
import { READINESS_STATUSES, type ReadinessStatus } from '@pacelog/shared';

export interface IDailyReadinessDocument extends Document {
  userId: string;
  dateKey: string; // YYYY-MM-DD
  sleepQuality: number;
  sleepHours?: number;
  muscleRecovery: number;
  energyLevel: number;
  focusLevel: number;
  bodyWeightKg?: number;
  readinessScore: number;
  readinessStatus: ReadinessStatus;
  recommendation: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const dailyReadinessSchema = new Schema<IDailyReadinessDocument>(
  {
    userId: { type: String, required: true, index: true },
    dateKey: { type: String, required: true, maxlength: 10 },
    sleepQuality: { type: Number, required: true, min: 1, max: 5 },
    sleepHours: { type: Number, min: 0, max: 24 },
    muscleRecovery: { type: Number, required: true, min: 1, max: 5 },
    energyLevel: { type: Number, required: true, min: 1, max: 5 },
    focusLevel: { type: Number, required: true, min: 1, max: 5, default: 3 },
    bodyWeightKg: { type: Number, min: 20, max: 350 },
    readinessScore: { type: Number, required: true, min: 0, max: 100 },
    readinessStatus: {
      type: String,
      required: true,
      enum: READINESS_STATUSES,
      default: 'ready',
    },
    recommendation: { type: String, required: true, maxlength: 400 },
    notes: { type: String, maxlength: 300 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id?.toString() ?? ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

dailyReadinessSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

export const DailyReadinessModel = mongoose.model<IDailyReadinessDocument>(
  'DailyReadiness',
  dailyReadinessSchema
);
