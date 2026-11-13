import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import { GearModel } from './gear.model.js';
import { computeGearUsageDeltas } from './gear.usage.js';
import {
  GEAR_CATEGORY_META,
  type CreateGearDTO,
  type UpdateGearDTO,
  type GearComponentInput,
  type GearCategory,
  type GearImpact,
} from '@pacelog/shared';

const GEAR_NOT_FOUND = 'Gear not found';

export class GearService {
  async getGearByUser(userId: string, includeArchived = false, category?: GearCategory) {
    const filter: any = { userId };
    if (!includeArchived) {
      filter.status = { $ne: 'archived' };
    }
    if (category) {
      filter.category = category;
    }
    const items = await GearModel.find(filter).sort({ createdAt: -1 });
    return items.map((g) => g.toJSON());
  }

  async getGearById(userId: string, gearId: string) {
    const gear = await GearModel.findOne({ _id: gearId, userId });
    if (!gear) throw new Error(GEAR_NOT_FOUND);
    return gear.toJSON();
  }

  async createGear(userId: string, data: CreateGearDTO) {
    const meta = GEAR_CATEGORY_META[data.category];

    // O padrão é por categoria: um tênis padrão, um par de luvas padrão, etc.
    let isDefault = data.isDefault || false;
    if (isDefault) {
      await GearModel.updateMany(
        { userId, category: data.category, isDefault: true },
        { isDefault: false }
      );
    } else {
      const activeCount = await GearModel.countDocuments({
        userId,
        category: data.category,
        status: 'active',
      });
      if (activeCount === 0) {
        isDefault = true;
      }
    }

    const initialKm = data.initialDistanceKm || 0;
    const now = new Date();

    const components = meta.supportsComponents
      ? (data.components || []).map((c) => this.buildComponent(c, initialKm, now))
      : [];

    const gear = new GearModel({
      userId,
      category: data.category,
      brand: data.brand,
      model: data.model,
      nickname: data.nickname,
      color: data.color,
      imageUrl: data.imageUrl,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      startedUsingAt: data.startedUsingAt ? new Date(data.startedUsingAt) : undefined,
      initialDistanceKm: initialKm,
      accumulatedDistanceKm: initialKm,
      distanceLimitKm: data.distanceLimitKm,
      accumulatedRounds: data.initialRounds || 0,
      roundsLimit: data.roundsLimit,
      accumulatedSessions: data.initialSessions || 0,
      sessionsLimit: data.sessionsLimit,
      components,
      isDefault,
      status: 'active',
    });

    await gear.save();
    return gear.toJSON();
  }

  async updateGear(userId: string, gearId: string, data: UpdateGearDTO) {
    const gear = await GearModel.findOne({ _id: gearId, userId });
    if (!gear) throw new Error(GEAR_NOT_FOUND);

    if (data.brand !== undefined) gear.brand = data.brand;
    if (data.model !== undefined) gear.set('model', data.model);
    if (data.nickname !== undefined) gear.nickname = data.nickname;
    if (data.color !== undefined) gear.color = data.color;
    if (data.imageUrl !== undefined) gear.imageUrl = data.imageUrl;
    if (data.distanceLimitKm !== undefined) gear.distanceLimitKm = data.distanceLimitKm;
    if (data.roundsLimit !== undefined) gear.roundsLimit = data.roundsLimit;
    if (data.sessionsLimit !== undefined) gear.sessionsLimit = data.sessionsLimit;
    if (data.purchaseDate !== undefined) {
      gear.purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : undefined;
    }
    if (data.startedUsingAt !== undefined) {
      gear.startedUsingAt = data.startedUsingAt ? new Date(data.startedUsingAt) : undefined;
    }

    await gear.save();
    return gear.toJSON();
  }

  async setDefault(userId: string, gearId: string) {
    const gear = await GearModel.findOne({ _id: gearId, userId });
    if (!gear) throw new Error(GEAR_NOT_FOUND);
    if (gear.status !== 'active') throw new Error('Only active gear can be set as default');

    // Remove o padrão anterior somente dentro da mesma categoria
    await GearModel.updateMany(
      { userId, category: gear.category, isDefault: true },
      { isDefault: false }
    );

    gear.isDefault = true;
    await gear.save();
    return gear.toJSON();
  }

  async retireGear(userId: string, gearId: string) {
    const gear = await GearModel.findOne({ _id: gearId, userId });
    if (!gear) throw new Error(GEAR_NOT_FOUND);

    gear.status = 'retired';
    gear.isDefault = false;

    await gear.save();
    return gear.toJSON();
  }

  async archiveGear(userId: string, gearId: string) {
    const gear = await GearModel.findOne({ _id: gearId, userId });
    if (!gear) throw new Error(GEAR_NOT_FOUND);

    gear.status = 'archived';
    gear.isDefault = false;

    await gear.save();
    return gear.toJSON();
  }

  // ==========================================
  // COMPONENTES (corrente, pneus... — somente bicicletas)
  // ==========================================

  async addComponent(userId: string, gearId: string, input: GearComponentInput) {
    const gear = await this.findComponentOwner(userId, gearId);
    gear.components.push(
      this.buildComponent(input, gear.accumulatedDistanceKm, new Date())
    );
    await gear.save();
    return gear.toJSON();
  }

  /** Registra a troca: o componente volta a zero km, a partir do km atual da bike. */
  async replaceComponent(userId: string, gearId: string, componentId: string) {
    const gear = await this.findComponentOwner(userId, gearId);
    const component = gear.components.find((c) => c.id === componentId);
    if (!component) throw new Error('Component not found');

    component.installedAtKm = gear.accumulatedDistanceKm;
    component.installedAt = new Date();
    component.replacements = (component.replacements || 0) + 1;

    gear.markModified('components');
    await gear.save();
    return gear.toJSON();
  }

  async removeComponent(userId: string, gearId: string, componentId: string) {
    const gear = await this.findComponentOwner(userId, gearId);
    const before = gear.components.length;
    gear.set(
      'components',
      gear.components.filter((c) => c.id !== componentId)
    );
    if (gear.components.length === before) throw new Error('Component not found');

    await gear.save();
    return gear.toJSON();
  }

  private async findComponentOwner(userId: string, gearId: string) {
    const gear = await GearModel.findOne({ _id: gearId, userId });
    if (!gear) throw new Error(GEAR_NOT_FOUND);
    if (!GEAR_CATEGORY_META[gear.category]?.supportsComponents) {
      throw new Error('Esta categoria de equipamento não suporta componentes');
    }
    return gear;
  }

  private buildComponent(input: GearComponentInput, currentKm: number, now: Date) {
    return {
      id: randomUUID(),
      name: input.name,
      // O componente já pode ter rodado antes de ser cadastrado: o "ponto de partida" fica atrás do km atual.
      installedAtKm: currentKm - (input.alreadyUsedKm || 0),
      distanceLimitKm: input.distanceLimitKm,
      installedAt: now,
      replacements: 0,
    };
  }

  // ==========================================
  // DESGASTE POR SESSÃO (chamado por session.service.ts)
  // ==========================================

  /**
   * Aplica a variação de uso causada por uma sessão que mudou de `prev` para `next`.
   * Cobre criação (prev nulo), exclusão (next nulo) e edição (inclusive troca de equipamento).
   */
  async applyUsageDelta(
    userId: string,
    prev: GearImpact | null,
    next: GearImpact | null
  ): Promise<void> {
    const deltas = computeGearUsageDeltas(prev, next);
    for (const delta of deltas) {
      if (!mongoose.isValidObjectId(delta.gearId)) continue;

      // Atômico (sem read-modify-write) e com piso em 0, para exclusões nunca deixarem o contador negativo.
      const add = (field: string, by: number) => ({
        $max: [0, { $add: [{ $ifNull: [`$${field}`, 0] }, by] }],
      });

      await GearModel.updateOne({ _id: delta.gearId, userId }, [
        {
          $set: {
            accumulatedDistanceKm: add('accumulatedDistanceKm', delta.km),
            accumulatedSessions: add('accumulatedSessions', delta.sessions),
            accumulatedRounds: add('accumulatedRounds', delta.rounds),
          },
        },
      ]);
    }
  }
}

export const gearService = new GearService();
