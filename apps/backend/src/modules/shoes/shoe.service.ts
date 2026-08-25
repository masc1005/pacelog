import { ShoeModel, IShoeDocument } from './shoe.model.js';
import type { CreateShoeDTO, UpdateShoeDTO } from '@pacelog/shared';

export class ShoeService {
  async getShoesByUser(userId: string, includeArchived = false) {
    const filter: any = { userId };
    if (!includeArchived) {
      filter.status = { $ne: 'archived' };
    }
    const shoes = await ShoeModel.find(filter).sort({ createdAt: -1 });
    return shoes.map(s => s.toJSON());
  }

  async getShoeById(userId: string, shoeId: string) {
    const shoe = await ShoeModel.findOne({ _id: shoeId, userId });
    if (!shoe) throw new Error('Shoe not found');
    return shoe.toJSON();
  }

  async createShoe(userId: string, data: CreateShoeDTO) {
    // If it's the first active shoe or marked as default, make it default
    let isDefault = data.isDefault || false;
    
    if (isDefault) {
      await ShoeModel.updateMany({ userId, isDefault: true }, { isDefault: false });
    } else {
      const activeShoesCount = await ShoeModel.countDocuments({ userId, status: 'active' });
      if (activeShoesCount === 0) {
        isDefault = true;
      }
    }

    const newShoe = new ShoeModel({
      ...data,
      userId,
      accumulatedDistanceKm: data.initialDistanceKm || 0,
      isDefault,
      status: 'active',
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      startedUsingAt: data.startedUsingAt ? new Date(data.startedUsingAt) : undefined,
    });

    await newShoe.save();
    return newShoe.toJSON();
  }

  async updateShoe(userId: string, shoeId: string, data: UpdateShoeDTO) {
    const shoe = await ShoeModel.findOne({ _id: shoeId, userId });
    if (!shoe) throw new Error('Shoe not found');

    if (data.brand !== undefined) shoe.brand = data.brand;
    if (data.model !== undefined) shoe.set('model', data.model);
    if (data.nickname !== undefined) shoe.nickname = data.nickname;
    if (data.color !== undefined) shoe.color = data.color;
    if (data.imageUrl !== undefined) shoe.imageUrl = data.imageUrl;
    if (data.distanceLimitKm !== undefined) shoe.distanceLimitKm = data.distanceLimitKm;
    if (data.purchaseDate !== undefined) shoe.purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : undefined;
    if (data.startedUsingAt !== undefined) shoe.startedUsingAt = data.startedUsingAt ? new Date(data.startedUsingAt) : undefined;

    await shoe.save();
    return shoe.toJSON();
  }

  async setDefault(userId: string, shoeId: string) {
    const shoe = await ShoeModel.findOne({ _id: shoeId, userId });
    if (!shoe) throw new Error('Shoe not found');
    if (shoe.status !== 'active') throw new Error('Only active shoes can be set as default');

    // Remove old default
    await ShoeModel.updateMany({ userId, isDefault: true }, { isDefault: false });

    // Set new default
    shoe.isDefault = true;
    await shoe.save();
    return shoe.toJSON();
  }

  async retireShoe(userId: string, shoeId: string) {
    const shoe = await ShoeModel.findOne({ _id: shoeId, userId });
    if (!shoe) throw new Error('Shoe not found');
    
    shoe.status = 'retired';
    if (shoe.isDefault) {
      shoe.isDefault = false;
    }
    
    await shoe.save();
    return shoe.toJSON();
  }

  async archiveShoe(userId: string, shoeId: string) {
    const shoe = await ShoeModel.findOne({ _id: shoeId, userId });
    if (!shoe) throw new Error('Shoe not found');
    
    shoe.status = 'archived';
    if (shoe.isDefault) {
      shoe.isDefault = false;
    }
    
    await shoe.save();
    return shoe.toJSON();
  }

  // Called by session.service.ts
  async updateDistanceTransaction(
    userId: string, 
    shoeId: string, 
    distanceDeltaKm: number,
    session: any = null // mongoose session if we use transactions
  ) {
    const shoe = await ShoeModel.findOne({ _id: shoeId, userId }).session(session);
    if (!shoe) return; // Silent return if shoe not found (might have been deleted/archived?)
    
    shoe.accumulatedDistanceKm = Math.max(0, shoe.accumulatedDistanceKm + distanceDeltaKm);
    await shoe.save({ session });
  }
}
