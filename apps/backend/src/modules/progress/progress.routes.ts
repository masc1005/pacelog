import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import {
  getProgressOverviewController,
  getSportProgressController,
  getPersonalRecordsController,
} from './progress.controller.js';

export const progressRoutes = Router();

// Todas as rotas de telemetria e evolução requerem atleta autenticado
progressRoutes.use(requireAuth);

progressRoutes.get('/overview', getProgressOverviewController);
progressRoutes.get('/sports/:sportKey', getSportProgressController);
progressRoutes.get('/prs', getPersonalRecordsController);
