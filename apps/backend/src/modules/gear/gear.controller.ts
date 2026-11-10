import { Request, Response } from 'express';
import { gearService } from './gear.service.js';
import {
  createGearSchema,
  updateGearSchema,
  gearComponentInputSchema,
  GEAR_CATEGORIES,
  type GearCategory,
} from '@pacelog/shared';

function sendError(res: Response, error: any, fallbackStatus: number) {
  if (error?.name === 'ZodError') {
    res.status(400).json({ error: 'Validation Error', details: error.errors });
    return;
  }
  res.status(fallbackStatus).json({ error: error?.message || 'Unexpected error' });
}

export class GearController {
  async getGear(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const includeArchived = req.query.includeArchived === 'true';
      const rawCategory = req.query.category;
      const category =
        typeof rawCategory === 'string' && (GEAR_CATEGORIES as readonly string[]).includes(rawCategory)
          ? (rawCategory as GearCategory)
          : undefined;
      const items = await gearService.getGearByUser(userId, includeArchived, category);
      res.json(items);
    } catch (error: any) {
      sendError(res, error, 500);
    }
  }

  async getGearById(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const gear = await gearService.getGearById(userId, req.params.id as string);
      res.json(gear);
    } catch (error: any) {
      sendError(res, error, 404);
    }
  }

  async createGear(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const data = createGearSchema.parse(req.body);
      const gear = await gearService.createGear(userId, data);
      res.status(201).json(gear);
    } catch (error: any) {
      sendError(res, error, 500);
    }
  }

  async updateGear(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const data = updateGearSchema.parse(req.body);
      const gear = await gearService.updateGear(userId, req.params.id as string, data);
      res.json(gear);
    } catch (error: any) {
      sendError(res, error, 400);
    }
  }

  async setDefault(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      res.json(await gearService.setDefault(userId, req.params.id as string));
    } catch (error: any) {
      sendError(res, error, 400);
    }
  }

  async retireGear(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      res.json(await gearService.retireGear(userId, req.params.id as string));
    } catch (error: any) {
      sendError(res, error, 400);
    }
  }

  async archiveGear(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      res.json(await gearService.archiveGear(userId, req.params.id as string));
    } catch (error: any) {
      sendError(res, error, 400);
    }
  }

  async addComponent(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const data = gearComponentInputSchema.parse(req.body);
      res.status(201).json(await gearService.addComponent(userId, req.params.id as string, data));
    } catch (error: any) {
      sendError(res, error, 400);
    }
  }

  async replaceComponent(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      res.json(
        await gearService.replaceComponent(
          userId,
          req.params.id as string,
          req.params.componentId as string
        )
      );
    } catch (error: any) {
      sendError(res, error, 400);
    }
  }

  async removeComponent(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      res.json(
        await gearService.removeComponent(
          userId,
          req.params.id as string,
          req.params.componentId as string
        )
      );
    } catch (error: any) {
      sendError(res, error, 400);
    }
  }
}
