import mongoose, { Schema, Document } from 'mongoose';
import type { AIInsightDTO } from '@pacelog/shared';

export interface IInsight extends Document, Omit<AIInsightDTO, 'id'> {}

const InsightSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['daily_coach', 'recovery_warning', 'milestone_celebration'], required: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// TTL de 90 dias: Exclui insights antigos para economizar banco (ou menos se desejar)
InsightSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
// Índice para buscar o mais recente rapidamente
InsightSchema.index({ userId: 1, createdAt: -1 });

export const InsightModel = mongoose.model<IInsight>('Insight', InsightSchema);
