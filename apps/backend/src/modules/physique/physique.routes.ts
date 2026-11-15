import express, { Router } from 'express';
import {
  CreatePhysiqueAssessmentInputSchema,
  GeneratePhysiquePlanInputSchema,
} from '@pacelog/shared';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import {
  assessPhysiqueController,
  listAssessmentsController,
  getAssessmentByIdController,
  generateCorrectionPlanController,
} from './physique.controller.js';

export const physiqueRoutes = Router();

// Todas as rotas exigem autenticação
physiqueRoutes.use(requireAuth);

// Aplica express.json({ limit: '8mb' }) exclusivamente na rota POST /physique/assess
physiqueRoutes.post(
  '/assess',
  express.json({ limit: '8mb' }),
  validate(CreatePhysiqueAssessmentInputSchema),
  assessPhysiqueController
);

physiqueRoutes.get('/', listAssessmentsController);
physiqueRoutes.get('/:id', getAssessmentByIdController);
physiqueRoutes.post(
  '/:id/generate-plan',
  validate(GeneratePhysiquePlanInputSchema),
  generateCorrectionPlanController
);
