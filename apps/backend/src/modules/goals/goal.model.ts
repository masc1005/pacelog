import mongoose, { Document, Schema } from 'mongoose';
import {
  SPORT_KEYS,
  GOAL_SCOPES,
  GOAL_METRIC_TYPES,
  GOAL_DIRECTIONS,
  GOAL_TYPES,
  GOAL_PERIODS,
  GOAL_STATUSES,
  type SportKey,
  type GoalScope,
  type GoalMetricType,
  type GoalDirection,
  type GoalType,
  type GoalPeriod,
  type GoalStatus,
} from '@pacelog/shared';

export interface IGoalDocument extends Document {
  userId: string;
  clientUuid?: string;
  title: string;
  scope: GoalScope;
  sportKey?: SportKey | null;
  metricType: GoalMetricType;
  direction: GoalDirection;
  type?: GoalType;
  targetValue: number;
  startValue?: number;
  unit: string;
  period: GoalPeriod;
  startDate: Date;
  deadline?: Date;
  status: GoalStatus;
  notes?: string;
  completedAt?: Date;
  pausedAt?: Date;
  celebrationShown?: boolean;
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
    clientUuid: {
      type: String,
      required: false,
      sparse: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    scope: {
      type: String,
      required: true,
      enum: GOAL_SCOPES,
      default: 'sport',
    },
    sportKey: {
      type: String,
      required: false,
      enum: [...SPORT_KEYS, null],
      default: null,
    },
    metricType: {
      type: String,
      required: true,
      enum: GOAL_METRIC_TYPES,
      default: 'sessions_count',
    },
    direction: {
      type: String,
      required: true,
      enum: GOAL_DIRECTIONS,
      default: 'increase',
    },
    type: {
      type: String,
      required: false,
      enum: GOAL_TYPES,
    },
    targetValue: {
      type: Number,
      required: true,
      min: 0.01,
    },
    startValue: {
      type: Number,
      required: false,
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
    completedAt: {
      type: Date,
      required: false,
    },
    pausedAt: {
      type: Date,
      required: false,
    },
    celebrationShown: {
      type: Boolean,
      default: false,
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
goalSchema.index({ userId: 1, scope: 1 });
goalSchema.index({ userId: 1, clientUuid: 1 });

export const GoalModel = mongoose.model<IGoalDocument>('Goal', goalSchema);

