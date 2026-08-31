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

export async function deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.userId) {
      throw new HttpError(401, 'UNAUTHORIZED');
    }
    const { confirmation } = req.body;
    if (confirmation !== 'EXCLUIR') {
      throw new HttpError(400, 'INVALID_CONFIRMATION', {
        message: 'Digite EXCLUIR para confirmar a exclusão da conta',
      });
    }
    await profileService.deleteAccountAndData(req.userId);
    res.status(200).json({ success: true, message: 'Conta e dados excluídos com sucesso' });
  } catch (error) {
    next(error);
  }
}
