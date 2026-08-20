import { Schema, model, Document } from 'mongoose';
import { SPORT_KEYS, type SportKey } from '@pacelog/shared';

export interface ISport extends Document {
  sportKey: SportKey;
  name: string;
  category: 'endurance' | 'team' | 'combat' | 'strength';
  icon: string;
  color: string;
  supportedMetrics: string[];
  description?: string;
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const sportSchema = new Schema<ISport>(
  {
    sportKey: {
      type: String,
      required: true,
      unique: true,
      enum: SPORT_KEYS,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['endurance', 'team', 'combat', 'strength'],
    },
    icon: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    supportedMetrics: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const SportModel = model<ISport>('Sport', sportSchema);
