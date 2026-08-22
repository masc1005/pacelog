import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import {
  // Legados
  getProgressOverviewController,
  getSportProgressController,
  getPersonalRecordsController,
  // V2
  getProgressSummaryController,
  getComparisonController,
  getSportProgressV2Controller,
  getLoadTimelineController,
  getTimelineController,
} from './progress.controller.js';

export const progressRoutes = Router();

// Todas as rotas de telemetria e evolução requerem atleta autenticado
progressRoutes.use(requireAuth);

// ==========================================
// ROTAS LEGADAS — mantidas para compatibilidade
// ==========================================
progressRoutes.get('/overview', getProgressOverviewController);
progressRoutes.get('/sports/:sportKey', getSportProgressController);
progressRoutes.get('/prs', getPersonalRecordsController);

// ==========================================
// ROTAS V2 — novos endpoints contextualizados
// GET /api/progress/summary        → carga + sessões + distribuição por esporte
// GET /api/progress/comparison     → ranking de evolução e consistência
// GET /api/progress/load           → série temporal de carga semanal
// GET /api/progress/by-sport/:key  → progresso por esporte com métrica principal
// GET /api/progress/timeline       → série diária de treinos
// ==========================================
progressRoutes.get('/summary', getProgressSummaryController);
progressRoutes.get('/comparison', getComparisonController);
progressRoutes.get('/load', getLoadTimelineController);
progressRoutes.get('/by-sport/:sportKey', getSportProgressV2Controller);
progressRoutes.get('/timeline', getTimelineController);
