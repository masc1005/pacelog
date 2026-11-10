import mongoose, { Schema } from 'mongoose';
import { GEAR_CATEGORIES, type GearCategory, type GearStatus } from '@pacelog/shared';

export interface IGearComponent {
  id: string;
  name: string;
  installedAtKm: number;
  distanceLimitKm?: number;
  installedAt?: Date;
  replacements: number;
}

export interface IGearDocument {
  userId: string;
  category: GearCategory;
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
  accumulatedSessions: number;
  accumulatedRounds: number;
  sessionsLimit?: number;
  roundsLimit?: number;
  components: IGearComponent[];
  status: GearStatus;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const componentSchema = new Schema<IGearComponent>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    installedAtKm: { type: Number, required: true, default: 0 },
    distanceLimitKm: { type: Number, min: 0 },
    installedAt: { type: Date },
    replacements: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const gearSchema = new Schema<IGearDocument>(
  {
    userId: { type: String, required: true, index: true },
    // Documentos antigos (anteriores ao tracker de equipamentos) eram sempre tênis de corrida.
    category: { type: String, enum: GEAR_CATEGORIES, default: 'running_shoe', required: true },
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
    accumulatedSessions: { type: Number, required: true, min: 0, default: 0 },
    accumulatedRounds: { type: Number, required: true, min: 0, default: 0 },
    sessionsLimit: { type: Number, min: 0 },
    roundsLimit: { type: Number, min: 0 },
    components: { type: [componentSchema], default: [] },
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

gearSchema.index({ userId: 1, status: 1 });
gearSchema.index({ userId: 1, category: 1, status: 1 });

// A coleção continua sendo `shoes` para preservar os dados já cadastrados pelos usuários.
export const GearModel = mongoose.model<IGearDocument>('Gear', gearSchema, 'shoes');
