import mongoose from 'mongoose';
import type { CreateInjuryInput, UpdateInjuryInput, InjuryStatus } from '@pacelog/shared';
import { InjuryModel } from './injury.model.js';
import { scopedFilter } from '../../utils/scopedQuery.js';
import { HttpError } from '../../utils/httpError.js';

export class InjuryService {
  async list(userId: string, status?: InjuryStatus) {
    const filter = status ? scopedFilter(userId, { status }) : scopedFilter(userId);
    const injuries = await InjuryModel.find(filter).sort({ updatedAt: -1 }).lean();
    return injuries.map((injury: any) => this.serialize(injury));
  }

  async create(userId: string, input: CreateInjuryInput) {
    const now = new Date();
    const injury = await InjuryModel.create({
      userId,
      region: input.region,
      side: input.side,
      severity: input.severity,
      category: input.category,
      notes: input.notes,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : now,
      status: 'active',
      history: [{
        severity: input.severity,
        status: 'active',
        recordedAt: now,
        notes: input.notes,
      }],
    });
    return this.serialize(injury.toJSON());
  }

  async update(userId: string, id: string, input: UpdateInjuryInput) {
    if (!mongoose.isValidObjectId(id)) {
      throw new HttpError(404, 'INJURY_NOT_FOUND');
    }
    const injury = await InjuryModel.findOne(scopedFilter(userId, { _id: id }));
    if (!injury) throw new HttpError(404, 'INJURY_NOT_FOUND');

    if (input.severity !== undefined) injury.severity = input.severity;
    if (input.status !== undefined) injury.status = input.status;
    if (input.notes !== undefined) injury.notes = input.notes;
    if (input.resolvedAt !== undefined) {
      injury.resolvedAt = input.resolvedAt ? new Date(input.resolvedAt) : undefined;
    }
    if (input.status === 'resolved' && !injury.resolvedAt) {
      injury.resolvedAt = new Date();
    }

    injury.history.push({
      severity: injury.severity,
      status: injury.status,
      recordedAt: new Date(),
      notes: injury.notes,
    });
    await injury.save();
    return this.serialize(injury.toJSON());
  }

  async remove(userId: string, id: string) {
    if (!mongoose.isValidObjectId(id)) {
      throw new HttpError(404, 'INJURY_NOT_FOUND');
    }
    const deleted = await InjuryModel.findOneAndDelete(scopedFilter(userId, { _id: id }));
    if (!deleted) throw new HttpError(404, 'INJURY_NOT_FOUND');
  }

  private serialize(injury: any) {
    return {
      ...injury,
      id: injury.id ?? injury._id?.toString(),
      occurredAt: injury.occurredAt instanceof Date ? injury.occurredAt.toISOString() : injury.occurredAt,
      resolvedAt: injury.resolvedAt ? new Date(injury.resolvedAt).toISOString() : null,
      createdAt: injury.createdAt instanceof Date ? injury.createdAt.toISOString() : injury.createdAt,
      updatedAt: injury.updatedAt instanceof Date ? injury.updatedAt.toISOString() : injury.updatedAt,
      history: (injury.history ?? []).map((point: any) => ({
        ...point,
        recordedAt: point.recordedAt instanceof Date ? point.recordedAt.toISOString() : point.recordedAt,
      })),
    };
  }
}

export const injuryService = new InjuryService();
