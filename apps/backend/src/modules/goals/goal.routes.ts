import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate, validateQuery } from '../../middleware/validate.js';
import {
  createGoalController,
  listGoalsController,
  getGoalByIdController,
  updateGoalController,
  pauseGoalController,
  resumeGoalController,
  completeGoalController,
  deleteGoalController,
} from './goal.controller.js';
import {
  createGoalSchema,
  updateGoalSchema,
  listGoalsQuerySchema,
} from './goal.schemas.js';

export const goalRoutes = Router();

// Todas as rotas de metas requerem atleta autenticado
goalRoutes.use(requireAuth);

goalRoutes.post(
  '/',
  validate(createGoalSchema),
  createGoalController
);

goalRoutes.get(
  '/',
  validateQuery(listGoalsQuerySchema),
  listGoalsController
);

goalRoutes.get(
  '/:id',
  getGoalByIdController
);

goalRoutes.put(
  '/:id',
  validate(updateGoalSchema),
  updateGoalController
);

goalRoutes.patch(
  '/:id',
  validate(updateGoalSchema),
  updateGoalController
);

goalRoutes.post(
  '/:id/pause',
  pauseGoalController
);

goalRoutes.post(
  '/:id/resume',
  resumeGoalController
);

goalRoutes.post(
  '/:id/complete',
  completeGoalController
);

goalRoutes.delete(
  '/:id',
  deleteGoalController
);
