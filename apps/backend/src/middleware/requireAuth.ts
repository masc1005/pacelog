import type { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../config/auth.js';
import { HttpError } from '../utils/httpError.js';

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      return next(new HttpError(401, 'UNAUTHORIZED'));
    }

    req.userId = session.user.id;

    // Contexto de usuário no Sentry: APENAS ID interno pseudo-anonimizado (sem PII)
    Sentry.setUser({
      id: session.user.id,
    });

    next();
  } catch (error) {
    next(error);
  }
}
