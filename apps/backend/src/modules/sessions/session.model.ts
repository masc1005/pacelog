import mongoose, { Document, Schema } from 'mongoose';
import {
  SPORT_KEYS,
  SESSION_STATUSES,
  type SportKey,
  type SessionStatus,
} from '@pacelog/shared';

export interface ISessionLoad {
  srpe: number;               // sRPE-TL = rpe × (durationSeconds / 60)
  rpe: number;                // RPE registrado (1–10)
  durationMinutes: number;    // duração em minutos
  calculationVersion: number; // versão da fórmula (atualmente 1)
}

export interface ISessionDocument extends Document {
  userId: string;
  clientUuid?: string;
  sportKey: SportKey;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;
  rpe: number;             // 1 a 10 (Borg CR10)
  sessionalLoad: number;   // LEGADO — mantido para retrocompatibilidade. Mesmo valor de load.srpe.
  load?: ISessionLoad;     // OFICIAL — campo estruturado. Use este em novos endpoints.
  status: SessionStatus;
  metrics: Record<string, any>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISessionDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    clientUuid: {
      type: String,
      required: false,
      trim: true,
    },
    sportKey: {
      type: String,
      required: true,
      enum: SPORT_KEYS,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      required: false,
    },
    durationSeconds: {
      type: Number,
      required: true,
      min: 0,
    },
    rpe: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    sessionalLoad: {
      type: Number,
      required: true,
      min: 0,
      // LEGADO — manter para retrocompatibilidade. Sincronizado com load.srpe.
    },
    load: {
      type: {
        srpe: { type: Number, required: true, min: 0 },
        rpe: { type: Number, required: true, min: 1, max: 10 },
        durationMinutes: { type: Number, required: true, min: 0 },
        calculationVersion: { type: Number, required: true, default: 1 },
      },
      required: false,
      default: null,
    },
    status: {
      type: String,
      enum: SESSION_STATUSES,
      default: 'completed',
    },
    metrics: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    notes: {
      type: String,
      required: false,
      maxlength: 1000,
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

// 1. Índice composto único para Idempotência Offline (userId + clientUuid)
// Garante que reenvios do mesmo treino pelo app não dupliquem registros no banco.
// O partialFilterExpression garante que documentos sem clientUuid (null/undefined) não colidam.
sessionSchema.index(
  { userId: 1, clientUuid: 1 },
  {
    unique: true,
    partialFilterExpression: { clientUuid: { $type: 'string' } },
  }
);

// 2. Índice composto para listagem cronológica eficiente por usuário
sessionSchema.index({ userId: 1, startedAt: -1 });

// 3. Índice composto para filtros por modalidade + ordenação cronológica
sessionSchema.index({ userId: 1, sportKey: 1, startedAt: -1 });

export const SessionModel = mongoose.model<ISessionDocument>(
  'Session',
  sessionSchema
);
