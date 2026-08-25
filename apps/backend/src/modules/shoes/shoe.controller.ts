import { Request, Response } from 'express';
import { ShoeService } from './shoe.service.js';
import { createShoeSchema, updateShoeSchema } from '@pacelog/shared';

const shoeService = new ShoeService();

export class ShoeController {
  async getShoes(req: Request, res: Response) {
    try {
      // req.user is set by auth middleware
      const userId = (req as any).user.id;
      const includeArchived = req.query.includeArchived === 'true';
      const shoes = await shoeService.getShoesByUser(userId, includeArchived);
      res.json(shoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getShoeById(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const shoeId = req.params.id as string;
      const shoe = await shoeService.getShoeById(userId, shoeId);
      res.json(shoe);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async createShoe(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const data = createShoeSchema.parse(req.body);
      const newShoe = await shoeService.createShoe(userId, data);
      res.status(201).json(newShoe);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation Error', details: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async updateShoe(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const shoeId = req.params.id as string;
      const data = updateShoeSchema.parse(req.body);
      const updatedShoe = await shoeService.updateShoe(userId, shoeId, data);
      res.json(updatedShoe);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation Error', details: error.errors });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  async setDefault(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const shoeId = req.params.id as string;
      const shoe = await shoeService.setDefault(userId, shoeId);
      res.json(shoe);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async retireShoe(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const shoeId = req.params.id as string;
      const shoe = await shoeService.retireShoe(userId, shoeId);
      res.json(shoe);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async archiveShoe(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const shoeId = req.params.id as string;
      const shoe = await shoeService.archiveShoe(userId, shoeId);
      res.json(shoe);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
