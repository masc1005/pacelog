import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { HttpError } from '../utils/httpError.js';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new HttpError(400, 'VALIDATION_ERROR', result.error.flatten()));
    }
    req.body = result.data;
    next();
  };
}
