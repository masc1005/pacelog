import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import {
  updateWeeklyScheduleDaySchema,
  updateWeeklyScheduleSchema,
} from '@pacelog/shared';
import {
  getScheduleController,
  updateScheduleDayController,
  updateFullScheduleController,
} from './schedule.controller.js';

export const scheduleRoutes = Router();

scheduleRoutes.use(requireAuth);

scheduleRoutes.get('/', getScheduleController);

scheduleRoutes.put(
  '/day',
  validate(updateWeeklyScheduleDaySchema),
  updateScheduleDayController
);

scheduleRoutes.put(
  '/',
  validate(updateWeeklyScheduleSchema),
  updateFullScheduleController
);
