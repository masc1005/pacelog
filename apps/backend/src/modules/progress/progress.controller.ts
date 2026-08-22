import type { Request, Response, NextFunction } from 'express';
import { progressService } from './progress.service.js';
import { SPORT_KEYS, type SportKey } from '@pacelog/shared';
import { HttpError } from '../../utils/httpError.js';

// ==========================================
// CONTROLLERS LEGADOS
// ==========================================

export async function getProgressOverviewController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const overview = await progressService.getOverview(userId);

    res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSportProgressController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const sportKey = req.params.sportKey as SportKey;

    if (!SPORT_KEYS.includes(sportKey)) {
      throw new HttpError(400, 'INVALID_SPORT_KEY', { sportKey });
    }

    const weeks = req.query.weeks ? Number(req.query.weeks) : 6;
    const progress = await progressService.getSportProgress(userId, sportKey, weeks);

    res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPersonalRecordsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const prs = await progressService.getPersonalRecords(userId);

    res.status(200).json({
      success: true,
      data: prs,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// CONTROLLERS V2 — Novos endpoints contextualizados
// ==========================================

/**
 * GET /api/progress/comparison
 * Ranking de evolução, eficiência e comparativos relativos.
 */
export async function getComparisonController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const periodDays = req.query.period ? Number(req.query.period) : 30;
    const comparison = await progressService.getComparison(userId, periodDays);

    res.status(200).json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    next(error);
  }
}


/**
 * GET /api/progress/summary
 * Visão consolidada com carga, sessões e distribuição por esporte.
 * Linguagem descritiva — sem termos médicos.
 */
export async function getProgressSummaryController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const periodDays = req.query.period ? Number(req.query.period) : 7;
    const summary = await progressService.getSummary(userId, periodDays);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/progress/by-sport/:sportKey
 * Progresso por esporte com métrica principal, baseline e confiança.
 * Nunca compara métricas entre esportes diferentes.
 */
export async function getSportProgressV2Controller(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const sportKey = req.params.sportKey as SportKey;

    if (!SPORT_KEYS.includes(sportKey)) {
      throw new HttpError(400, 'INVALID_SPORT_KEY', { sportKey });
    }

    const progress = await progressService.getSportProgressV2(userId, sportKey);

    res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/progress/load
 * Série temporal de carga semanal com baseline de 4 semanas.
 */
export async function getLoadTimelineController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const loadData = await progressService.getLoadTimeline(userId);

    res.status(200).json({
      success: true,
      data: loadData,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/progress/timeline
 * Série diária de treinos para o dashboard.
 */
export async function getTimelineController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const periodDays = req.query.period ? Number(req.query.period) : 30;
    const timeline = await progressService.getTimeline(userId, periodDays);

    res.status(200).json({
      success: true,
      data: timeline,
    });
  } catch (error) {
    next(error);
  }
}
