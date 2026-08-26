import mongoose, { Document, Schema } from 'mongoose';
import { MUSCLE_GROUPS, EQUIPMENT_TYPES, EXERCISE_TYPES } from '@pacelog/shared';

export interface IExerciseDocument extends Document {
  key: string;
  name: string;
  nameAlternatives: string[];
  primaryMuscleGroup: string;
  secondaryMuscleGroups: string[];
  equipment: string;
  type: string;
  isSystem: boolean;
  ownerId?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const exerciseSchema = new Schema<IExerciseDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, maxlength: 200, trim: true },
    nameAlternatives: { type: [String], default: [] },
    primaryMuscleGroup: {
      type: String,
      required: true,
      enum: MUSCLE_GROUPS,
    },
    secondaryMuscleGroups: { type: [String], default: [] },
    equipment: {
      type: String,
      required: true,
      enum: EQUIPMENT_TYPES,
    },
    type: {
      type: String,
      enum: EXERCISE_TYPES,
      default: 'compound',
    },
    isSystem: { type: Boolean, default: false },
    ownerId: { type: String, default: null },
    isActive: { type: Boolean, default: true },
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

// Índice para busca textual por nome
exerciseSchema.index({ name: 'text', nameAlternatives: 'text' });

// Índice para filtros por músculo/equipamento
exerciseSchema.index({ primaryMuscleGroup: 1, equipment: 1 });

// Exercícios do usuário
exerciseSchema.index({ ownerId: 1, isActive: 1 });

export const ExerciseModel = mongoose.model<IExerciseDocument>(
  'Exercise',
  exerciseSchema
);
