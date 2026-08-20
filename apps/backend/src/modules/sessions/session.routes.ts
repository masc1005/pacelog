import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate, validateQuery } from '../../middleware/validate.js';
import {
  createSessionController,
  listSessionsController,
  getSessionByIdController,
  updateSessionController,
  deleteSessionController,
  getSessionSummaryController,
} from './session.controller.js';
import {
  createSessionSchema,
  updateSessionSchema,
  listSessionsQuerySchema,
  sessionSummaryQuerySchema,
} from './session.schemas.js';

export const sessionRoutes = Router();

// Todas as rotas de sessão requerem atleta autenticado
sessionRoutes.use(requireAuth);

sessionRoutes.post(
  '/',
  validate(createSessionSchema),
  createSessionController
);

sessionRoutes.get(
  '/',
  validateQuery(listSessionsQuerySchema),
  listSessionsController
);

// Rota de resumo agregado (deve preceder /:id)
sessionRoutes.get(
  '/summary',
  validateQuery(sessionSummaryQuerySchema),
  getSessionSummaryController
);

sessionRoutes.get(
  '/:id',
  getSessionByIdController
);

sessionRoutes.put(
  '/:id',
  validate(updateSessionSchema),
  updateSessionController
);

sessionRoutes.delete(
  '/:id',
  deleteSessionController
);
