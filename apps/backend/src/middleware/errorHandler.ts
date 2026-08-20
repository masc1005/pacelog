import type { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { HttpError } from '../utils/httpError.js';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    // Erros operacionais 4xx não poluem o Sentry com falsos alertas
    res.status(err.status).json({
      error: err.code,
      details: err.details ?? null,
    });
    return;
  }

  // Erros inesperados 500: logados e reportados ao Sentry
  logger.error('Erro interno inesperado capturado no errorHandler:', err);
  Sentry.captureException(err);

  res.status(500).json({
    error: 'INTERNAL_ERROR',
  });
}
