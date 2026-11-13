import mongoose, { Document, Schema } from 'mongoose';
import { SPORT_KEYS, type WeeklyScheduleDayPlan } from '@pacelog/shared';

export interface IWeeklyScheduleDocument extends Document {
  userId: string;
  days: WeeklyScheduleDayPlan[];
  createdAt: Date;
  updatedAt: Date;
}

const workoutItemSchema = new Schema(
  {
    id: { type: String, required: true },
    sportKey: { type: String, required: true, enum: SPORT_KEYS },
    title: { type: String, maxlength: 100 },
    routineId: { type: String },
    routineName: { type: String, maxlength: 100 },
    targetDurationMinutes: { type: Number, min: 5, max: 600 },
    plannedTime: { type: String, maxlength: 10 },
    notes: { type: String, maxlength: 300 },
  },
  { _id: false }
);

const dayPlanSchema = new Schema(
  {
    weekday: { type: Number, required: true, min: 0, max: 6 },
    isRestDay: { type: Boolean, default: false },
    workouts: { type: [workoutItemSchema], default: [] },
  },
  { _id: false }
);

const weeklyScheduleSchema = new Schema<IWeeklyScheduleDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    days: { type: [dayPlanSchema], default: [] },
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

export const WeeklyScheduleModel = mongoose.model<IWeeklyScheduleDocument>(
  'WeeklySchedule',
  weeklyScheduleSchema
);
