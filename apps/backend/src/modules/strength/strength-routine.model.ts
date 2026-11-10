import mongoose, { Schema, type Document } from 'mongoose';
import { LOAD_UNITS, STRENGTH_SET_TYPES } from '@pacelog/shared';
import type { StrengthRoutineExerciseTemplate } from '@pacelog/shared';

export interface IStrengthRoutineDocument extends Document {
  userId: string;
  name: string;
  description?: string;
  exercises: StrengthRoutineExerciseTemplate[];
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RoutineSetTemplateSchema = new Schema(
  {
    setNumber: { type: Number, required: true, min: 1 },
    type: { type: String, enum: STRENGTH_SET_TYPES, default: 'working' },
    reps: { type: Number, min: 1 },
    load: { type: Number, min: 0 },
    loadUnit: { type: String, enum: LOAD_UNITS, default: 'kg' },
    restSeconds: { type: Number, min: 0 },
  },
  { _id: false }
);

const RoutineExerciseTemplateSchema = new Schema(
  {
    exerciseKey: { type: String, required: true },
    exerciseNameSnapshot: { type: String, required: true },
    primaryMuscleGroup: { type: String },
    equipment: { type: String },
    order: { type: Number, required: true, min: 0 },
    notes: { type: String },
    sets: { type: [RoutineSetTemplateSchema], default: [] },
  },
  { _id: false }
);

const StrengthRoutineSchema = new Schema<IStrengthRoutineDocument>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300 },
    exercises: { type: [RoutineExerciseTemplateSchema], default: [] },
    lastUsedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc: any, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

StrengthRoutineSchema.index({ userId: 1, updatedAt: -1 });

export const StrengthRoutineModel = mongoose.model<IStrengthRoutineDocument>(
  'StrengthRoutine',
  StrengthRoutineSchema
);
