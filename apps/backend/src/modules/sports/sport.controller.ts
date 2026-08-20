import type { Request, Response, NextFunction } from 'express';
import { SportModel } from './sport.model.js';

export async function listSports(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sports = await SportModel.find({ active: true }).sort({ order: 1 });
    res.status(200).json({ sports });
  } catch (error) {
    next(error);
  }
}
