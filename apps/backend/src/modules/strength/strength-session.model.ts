import mongoose, { Document, Schema } from 'mongoose';
import {
  LOAD_UNITS,
  SET_STATUSES,
  STRENGTH_SET_TYPES,
  ACTIVE_SESSION_STATUSES,
  STRENGTH_SESSION_STATUSES,
} from '@pacelog/shared';

// ==========================================
// SÉRIE
// ==========================================

export interface IStrengthSetDocument {
  id: string;
  setNumber: number;
  status: (typeof SET_STATUSES)[number];
  type: (typeof STRENGTH_SET_TYPES)[number];
  reps?: number;
  load?: number;
  loadUnit: (typeof LOAD_UNITS)[number];
  durationSeconds?: number;
  restSeconds?: number;
  rir?: number;
  rpe?: number;
  notes?: string;
  completedAt?: Date;
}

const strengthSetSchema = new Schema<IStrengthSetDocument>(
  {
    id: { type: String, required: true },
    setNumber: { type: Number, required: true, min: 1 },
    status: { type: String, enum: SET_STATUSES, default: 'planned' },
    type: { type: String, enum: STRENGTH_SET_TYPES, default: 'working' },
    reps: { type: Number, min: 1 },
    load: { type: Number, min: 0 },
    loadUnit: { type: String, enum: LOAD_UNITS, default: 'kg' },
    durationSeconds: { type: Number, min: 0 },
    restSeconds: { type: Number, min: 0 },
    rir: { type: Number, min: 0, max: 20 },
    rpe: { type: Number, min: 1, max: 10 },
    notes: { type: String, maxlength: 500 },
    completedAt: { type: Date },
  },
  { _id: false }
);

// ==========================================
// EXERCÍCIO DENTRO DA SESSÃO
// ==========================================

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

const strengthExerciseEntrySchema = new Schema<IStrengthExerciseEntryDocument>(
  {
    id: { type: String, required: true },
    exerciseKey: { type: String, required: true },
    exerciseNameSnapshot: { type: String, required: true, maxlength: 200 },
    primaryMuscleGroup: { type: String, maxlength: 100 },
    equipment: { type: String, maxlength: 100 },
    order: { type: Number, required: true, default: 0 },
    notes: { type: String, maxlength: 500 },
    sets: { type: [strengthSetSchema], default: [] },
  },
  { _id: false }
);

// ==========================================
// SESSÃO ATIVA DE MUSCULAÇÃO
// ==========================================

export interface IActiveStrengthSessionDocument extends Document {
  userId: string;
  sportKey: 'strength';
  status: (typeof STRENGTH_SESSION_STATUSES)[number];

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

    // Preenchidos na finalização
    finishedAt: { type: Date },
    durationSeconds: { type: Number, min: 0 },
    totalSets: { type: Number, min: 0 },
    completedSets: { type: Number, min: 0 },
    totalReps: { type: Number, min: 0 },
    totalVolumeKg: { type: Number, default: null },
    estimatedOneRepMax: { type: Number },
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
