import mongoose, { Document, Schema } from 'mongoose';
import {
  SPORT_KEYS,
  GOAL_TYPES,
  GOAL_PERIODS,
  GOAL_STATUSES,
  type SportKey,
  type GoalType,
  type GoalPeriod,
  type GoalStatus,
} from '@pacelog/shared';

export interface IGoalDocument extends Document {
  userId: string;
  title: string;
  type: GoalType;
  sportKey?: SportKey | null;
  targetValue: number;
  unit: string;
  period: GoalPeriod;
  startDate: Date;
  deadline?: Date;
  status: GoalStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const goalSchema = new Schema<IGoalDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    type: {
      type: String,
      required: true,
      enum: GOAL_TYPES,
    },
    sportKey: {
      type: String,
      required: false,
      enum: [...SPORT_KEYS, null],
      default: null,
    },
    targetValue: {
      type: Number,
      required: true,
      min: 0.1,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      default: 'sessions',
    },
    period: {
      type: String,
      required: true,
      enum: GOAL_PERIODS,
      default: 'weekly',
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    deadline: {
      type: Date,
      required: false,
    },
    status: {
      type: String,
      enum: GOAL_STATUSES,
      default: 'active',
      index: true,
    },
    notes: {
      type: String,
      required: false,
      maxlength: 500,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Índices compostos para consultas e filtros otimizados
goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ userId: 1, sportKey: 1 });

export const GoalModel = mongoose.model<IGoalDocument>('Goal', goalSchema);
