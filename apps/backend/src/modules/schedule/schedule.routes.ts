import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import {
  updateWeeklyScheduleDaySchema,
  updateWeeklyScheduleSchema,
  generateAIScheduleSchema,
} from '@pacelog/shared';
import {
  getScheduleController,
  updateScheduleDayController,
  updateFullScheduleController,
  activateDeloadController,
  generateAIScheduleController,
} from './schedule.controller.js';

export const scheduleRoutes = Router();

scheduleRoutes.use(requireAuth);

scheduleRoutes.get('/', getScheduleController);

scheduleRoutes.put(
  '/day',
  validate(updateWeeklyScheduleDaySchema),
  updateScheduleDayController
);

scheduleRoutes.post('/deload', activateDeloadController);

scheduleRoutes.post(
  '/ai-generate',
  validate(generateAIScheduleSchema),
  generateAIScheduleController
);

scheduleRoutes.put(
  '/',
  validate(updateWeeklyScheduleSchema),
  updateFullScheduleController
);
