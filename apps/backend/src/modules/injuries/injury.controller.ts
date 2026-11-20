import type { Request, Response } from 'express';
import { INJURY_STATUSES, CreateInjuryInputSchema, UpdateInjuryInputSchema, type InjuryStatus } from '@pacelog/shared';
import { injuryService } from './injury.service.js';

export class InjuryController {
  async list(req: Request, res: Response) {
    const status = typeof req.query.status === 'string' &&
      (INJURY_STATUSES as readonly string[]).includes(req.query.status)
      ? req.query.status as InjuryStatus
      : undefined;
    res.json(await injuryService.list(req.userId!, status));
  }

  async create(req: Request, res: Response) {
    const input = CreateInjuryInputSchema.parse(req.body);
    res.status(201).json(await injuryService.create(req.userId!, input));
  }

  async update(req: Request, res: Response) {
    const input = UpdateInjuryInputSchema.parse(req.body);
    res.json(await injuryService.update(req.userId!, req.params.id as string, input));
  }

  async remove(req: Request, res: Response) {
    await injuryService.remove(req.userId!, req.params.id as string);
    res.status(204).send();
  }
}
