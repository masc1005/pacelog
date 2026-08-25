import mongoose, { Document, Schema } from 'mongoose';
import type { ShoeStatus } from '@pacelog/shared';

export interface IShoeDocument {
  userId: string;
  brand?: string;
  model: string;
  nickname?: string;
  color?: string;
  imageUrl?: string;
  purchaseDate?: Date;
  startedUsingAt?: Date;
  initialDistanceKm: number;
  accumulatedDistanceKm: number;
  distanceLimitKm?: number;
  status: ShoeStatus;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const shoeSchema = new Schema<IShoeDocument>(
  {
    userId: { type: String, required: true, index: true },
    brand: { type: String, trim: true },
    model: { type: String, required: true, trim: true },
    nickname: { type: String, trim: true },
    color: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    purchaseDate: { type: Date },
    startedUsingAt: { type: Date },
    initialDistanceKm: { type: Number, required: true, min: 0, default: 0 },
    accumulatedDistanceKm: { type: Number, required: true, min: 0, default: 0 },
    distanceLimitKm: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ['active', 'retired', 'archived'],
      default: 'active',
      required: true,
    },
    isDefault: { type: Boolean, default: false },
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

shoeSchema.index({ userId: 1, status: 1 });

export const ShoeModel = mongoose.model<IShoeDocument>('Shoe', shoeSchema);
