import mongoose, { Schema, Document } from 'mongoose';
import {
  SET_STATUSES,
  STRENGTH_SET_TYPES,
  LOAD_UNITS,
  STRENGTH_SESSION_STATUSES,
  type StrengthSessionStatus,
  type SetStatus,
  type StrengthSetType,
  type LoadUnit,
} from '@pacelog/shared';

export interface IStrengthSetDocument {
  id: string;
  setNumber: number;
  status: SetStatus;
  type: StrengthSetType;

  reps?: number;
  load?: number;
  loadUnit: LoadUnit;

  durationSeconds?: number;
  restSeconds?: number;
  rir?: number;
  rpe?: number;

  notes?: string;
  completedAt?: Date;
}

export interface IStrengthExerciseEntryDocument {
  id: string;
  exerciseKey: string;
  exerciseNameSnapshot: string;
  primaryMuscleGroup?: string;
  equipment?: string;
  order: number;
  notes?: string;
  sets: IStrengthSetDocument[];
}

const strengthSetSchema = new Schema<IStrengthSetDocument>(
  {
    id: { type: String, required: true },
    setNumber: { type: Number, required: true },
    status: { type: String, enum: SET_STATUSES, required: true, default: 'planned' },
    type: { type: String, enum: STRENGTH_SET_TYPES, required: true, default: 'working' },

    reps: { type: Number, min: 1 },
    load: { type: Number, min: 0 },
    loadUnit: { type: String, enum: LOAD_UNITS, required: true, default: 'kg' },

    durationSeconds: { type: Number, min: 1 },
    restSeconds: { type: Number, min: 0 },
    rir: { type: Number, min: 0, max: 20 },
    rpe: { type: Number, min: 1, max: 10 },

    notes: { type: String, maxlength: 500 },
    completedAt: { type: Date },
  },
  { _id: false }
);

const strengthExerciseEntrySchema = new Schema<IStrengthExerciseEntryDocument>(
  {
    id: { type: String, required: true },
    exerciseKey: { type: String, required: true, index: true },
    exerciseNameSnapshot: { type: String, required: true, maxlength: 200 },
    primaryMuscleGroup: { type: String, maxlength: 100 },
    equipment: { type: String, maxlength: 100 },
    order: { type: Number, required: true, min: 0 },
    notes: { type: String, maxlength: 500 },
    sets: { type: [strengthSetSchema], default: [] },
  },
  { _id: false }
);

export interface IActiveStrengthSessionDocument extends Document {
  userId: string;
  sportKey: 'strength';
  status: StrengthSessionStatus;

  startedAt: Date;
  pausedAt?: Date;
  totalPausedSeconds: number;
  lastActivityAt: Date;

  exercises: IStrengthExerciseEntryDocument[];
  notes?: string;

  /** Versão monotônica para detecção de conflito entre dispositivos */
  clientVersion: number;
  /** IDs de operações já processadas (idempotência) */
  processedOperationIds: string[];

  // Métricas calculadas ao finalizar
  finishedAt?: Date;
  durationSeconds?: number;
  totalSets?: number;
  completedSets?: number;
  totalReps?: number;
  totalVolumeKg?: number | null;
  estimatedOneRepMax?: number;
  rpe?: number;

  createdAt: Date;
  updatedAt: Date;
}

const activeStrengthSessionSchema = new Schema<IActiveStrengthSessionDocument>(
  {
    userId: { type: String, required: true, index: true },
    sportKey: { type: String, default: 'strength', immutable: true },
    status: {
      type: String,
      enum: STRENGTH_SESSION_STATUSES,
      default: 'active',
    },

    startedAt: { type: Date, required: true, default: Date.now },
    pausedAt: { type: Date },
    totalPausedSeconds: { type: Number, default: 0, min: 0 },
    lastActivityAt: { type: Date, default: Date.now },

    exercises: { type: [strengthExerciseEntrySchema], default: [] },
    notes: { type: String, maxlength: 1000 },

    clientVersion: { type: Number, default: 0 },
    processedOperationIds: { type: [String], default: [] },

    // Preenchidos na finalização ou edição
    finishedAt: { type: Date },
    durationSeconds: { type: Number, min: 0 },
    totalSets: { type: Number, min: 0 },
    completedSets: { type: Number, min: 0 },
    totalReps: { type: Number, min: 0 },
    totalVolumeKg: { type: Number, default: null },
    estimatedOneRepMax: { type: Number },
    rpe: { type: Number, min: 1, max: 10 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        // Não expor lista interna de operações
        delete ret.processedOperationIds;
        return ret;
      },
    },
  }
);

// Garante que cada usuário tenha no máximo uma sessão ativa por vez
activeStrengthSessionSchema.index(
  { userId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['active', 'paused', 'finishing'] } },
  }
);

// Listagem cronológica eficiente por usuário
activeStrengthSessionSchema.index({ userId: 1, startedAt: -1 });

export const ActiveStrengthSessionModel = mongoose.model<IActiveStrengthSessionDocument>(
  'ActiveStrengthSession',
  activeStrengthSessionSchema
);
