import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { upsertDailyReadinessSchema } from '@pacelog/shared';
import {
  getReadinessOverviewController,
  upsertReadinessController,
} from './readiness.controller.js';

export const readinessRoutes = Router();

readinessRoutes.use(requireAuth);

readinessRoutes.get('/', getReadinessOverviewController);
readinessRoutes.post(
  '/',
  validate(upsertDailyReadinessSchema),
  upsertReadinessController
);
