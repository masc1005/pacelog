import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import {
  getReadinessOverviewController,
  upsertReadinessController,
} from './readiness.controller.js';

export const readinessRoutes = Router();

readinessRoutes.use(requireAuth);

readinessRoutes.get('/', getReadinessOverviewController);
readinessRoutes.post('/', upsertReadinessController);
