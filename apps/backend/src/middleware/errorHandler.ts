import type { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { HttpError } from '../utils/httpError.js';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: unknown,
  _req: Request,
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

  // Tratamento de ZodError que escape dos middlewares
  if ((err as any)?.name === 'ZodError') {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      details: (err as any).errors ?? (err as any).issues ?? null,
    });
    return;
  }

  // Tratamento de CastError do Mongoose (ex.: ObjectId inválido em parâmetro de rota)
  if ((err as any)?.name === 'CastError') {
    res.status(400).json({
      error: 'INVALID_ID',
      details: {
        path: (err as any).path,
        value: (err as any).value,
      },
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
