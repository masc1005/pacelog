import type { Request, Response, NextFunction } from 'express';
import * as profileService from './profile.service.js';
import { HttpError } from '../../utils/httpError.js';

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.userId) {
      throw new HttpError(401, 'UNAUTHORIZED');
    }
    const profile = await profileService.getOrCreateProfile(req.userId);
    res.status(200).json({ profile });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.userId) {
      throw new HttpError(401, 'UNAUTHORIZED');
    }
    const profile = await profileService.updateProfile(req.userId, req.body);
    res.status(200).json({ profile });
  } catch (error) {
    next(error);
  }
}

export async function updateActiveSports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.userId) {
      throw new HttpError(401, 'UNAUTHORIZED');
    }
    const profile = await profileService.updateActiveSports(req.userId, req.body);
    res.status(200).json({ profile });
  } catch (error) {
    next(error);
  }
}

export async function completeOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.userId) {
      throw new HttpError(401, 'UNAUTHORIZED');
    }
    const profile = await profileService.completeOnboarding(req.userId, req.body);
    res.status(200).json({ profile });
  } catch (error) {
    next(error);
  }
}
