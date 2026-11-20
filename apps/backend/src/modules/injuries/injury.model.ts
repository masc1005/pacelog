import mongoose, { Document, Schema } from 'mongoose';
import {
  INJURY_CATEGORIES,
  INJURY_SIDES,
  INJURY_STATUSES,
  type InjuryCategory,
  type InjurySide,
  type InjuryStatus,
} from '@pacelog/shared';

export interface InjuryHistoryPoint {
  severity: number;
  status: InjuryStatus;
  recordedAt: Date;
  notes?: string;
}

export interface IInjuryDocument extends Document {
  userId: string;
  region: string;
  side: InjurySide;
  severity: number;
  category: InjuryCategory;
  status: InjuryStatus;
  notes?: string;
  occurredAt: Date;
  resolvedAt?: Date;
  history: InjuryHistoryPoint[];
  createdAt: Date;
  updatedAt: Date;
}

const historySchema = new Schema<InjuryHistoryPoint>(
  {
    severity: { type: Number, required: true, min: 1, max: 10 },
    status: { type: String, required: true, enum: INJURY_STATUSES },
    recordedAt: { type: Date, required: true, default: Date.now },
    notes: { type: String, maxlength: 300 },
  },
  { _id: false }
);

const injurySchema = new Schema<IInjuryDocument>(
  {
    userId: { type: String, required: true, index: true },
    region: { type: String, required: true, trim: true, maxlength: 80 },
    side: { type: String, required: true, enum: INJURY_SIDES },
    severity: { type: Number, required: true, min: 1, max: 10 },
    category: { type: String, required: true, enum: INJURY_CATEGORIES },
    status: { type: String, required: true, enum: INJURY_STATUSES, default: 'active' },
    notes: { type: String, maxlength: 300 },
    occurredAt: { type: Date, required: true, default: Date.now },
    resolvedAt: { type: Date },
    history: { type: [historySchema], default: [] },
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

injurySchema.index({ userId: 1, status: 1, updatedAt: -1 });
injurySchema.index({ userId: 1, region: 1, side: 1 });

export const InjuryModel = mongoose.model<IInjuryDocument>('Injury', injurySchema);
