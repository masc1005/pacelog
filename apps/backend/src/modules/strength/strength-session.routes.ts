import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate, validateQuery } from '../../middleware/validate.js';
import {
  startSessionController,
  getActiveSessionController,
  getSessionByIdController,
  listSessionsController,
  patchSessionController,
  pauseSessionController,
  resumeSessionController,
  finishSessionController,
  cancelSessionController,
  addExerciseController,
  removeExerciseController,
  addSetController,
  completeSetController,
  editSetController,
  removeSetController,
} from './strength-session.controller.js';
import {
  searchExercisesController,
  getExerciseByKeyController,
  createCustomExerciseController,
} from './exercises.controller.js';
import {
  startStrengthSessionSchema,
  addExerciseInputSchema,
  addSetInputSchema,
  completeSetInputSchema,
  editSetInputSchema,
  finishSessionInputSchema,
  patchSessionInputSchema,
  listStrengthSessionsQuerySchema,
  exerciseSearchQuerySchema,
  createCustomExerciseSchema,
} from './strength-session.schemas.js';

export const strengthRoutes = Router();

// Todas as rotas requerem autenticação
strengthRoutes.use(requireAuth);

// ==========================================
// SESSÕES
// ==========================================

strengthRoutes.post(
  '/sessions',
  validate(startStrengthSessionSchema),
  startSessionController
);

strengthRoutes.get(
  '/sessions',
  validateQuery(listStrengthSessionsQuerySchema),
  listSessionsController
);

// Rota de sessão ativa (deve preceder /:id)
strengthRoutes.get('/sessions/active', getActiveSessionController);

strengthRoutes.get('/sessions/:id', getSessionByIdController);

strengthRoutes.patch(
  '/sessions/:id',
  validate(patchSessionInputSchema),
  patchSessionController
);

// Ciclo de vida da sessão
strengthRoutes.post('/sessions/:id/pause', pauseSessionController);
strengthRoutes.post('/sessions/:id/resume', resumeSessionController);
strengthRoutes.post(
  '/sessions/:id/finish',
  validate(finishSessionInputSchema),
  finishSessionController
);
strengthRoutes.post('/sessions/:id/cancel', cancelSessionController);

// Exercícios dentro da sessão
strengthRoutes.post(
  '/sessions/:id/exercises',
  validate(addExerciseInputSchema),
  addExerciseController
);
strengthRoutes.delete(
  '/sessions/:id/exercises/:exerciseId',
  removeExerciseController
);

// Séries
strengthRoutes.post(
  '/sessions/:id/sets',
  validate(addSetInputSchema),
  addSetController
);
strengthRoutes.post(
  '/sessions/:id/sets/complete',
  validate(completeSetInputSchema),
  completeSetController
);
strengthRoutes.patch(
  '/sessions/:id/exercises/:exerciseId/sets/:setId',
  validate(editSetInputSchema),
  editSetController
);
strengthRoutes.delete(
  '/sessions/:id/exercises/:exerciseId/sets/:setId',
  removeSetController
);

// ==========================================
// BIBLIOTECA DE EXERCÍCIOS
// ==========================================

strengthRoutes.get(
  '/exercises',
  validateQuery(exerciseSearchQuerySchema),
  searchExercisesController
);

strengthRoutes.get('/exercises/:key', getExerciseByKeyController);

strengthRoutes.post(
  '/exercises/custom',
  validate(createCustomExerciseSchema),
  createCustomExerciseController
);
