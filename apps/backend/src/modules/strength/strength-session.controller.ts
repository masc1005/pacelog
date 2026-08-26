import type { Request, Response, NextFunction } from 'express';
import { strengthSessionService } from './strength-session.service.js';
import type {
  StartStrengthSessionInput,
  AddExerciseInput,
  AddSetInput,
  CompleteSetInput,
  EditSetInput,
  FinishSessionInput,
  PatchSessionInput,
} from '@pacelog/shared';
import type { ListStrengthSessionsQuery } from './strength-session.schemas.js';

// Helper para extrair parâmetro de rota como string
const p = (val: string | string[]) => String(Array.isArray(val) ? val[0] : val);

// ==========================================
// SESSÃO
// ==========================================

export async function startSessionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const input = req.body as StartStrengthSessionInput;
    const session = await strengthSessionService.startSession(userId, input);
    res.status(201).json({ success: true, data: session.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function getActiveSessionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const session = await strengthSessionService.getActiveSession(userId);
    if (!session) {
      res.status(200).json({ success: true, data: null });
      return;
    }
    res.status(200).json({ success: true, data: session.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function getSessionByIdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const id = p(req.params.id);
    const session = await strengthSessionService.getSessionById(userId, id);
    res.status(200).json({ success: true, data: session.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function listSessionsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const query = req.query as unknown as ListStrengthSessionsQuery;
    const result = await strengthSessionService.listCompletedSessions(userId, query);
    res.status(200).json({
      success: true,
      data: result.items.map((s) => s.toJSON()),
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function patchSessionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const id = p(req.params.id);
    const input = req.body as PatchSessionInput;
    const session = await strengthSessionService.patchSession(userId, id, input);
    res.status(200).json({ success: true, data: session.toJSON() });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// CICLO DE VIDA
// ==========================================

export async function pauseSessionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await strengthSessionService.pauseSession(
      req.userId!,
      p(req.params.id)
    );
    res.status(200).json({ success: true, data: session.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function resumeSessionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await strengthSessionService.resumeSession(
      req.userId!,
      p(req.params.id)
    );
    res.status(200).json({ success: true, data: session.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function finishSessionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await strengthSessionService.finishSession(
      req.userId!,
      p(req.params.id),
      req.body as FinishSessionInput
    );
    res.status(200).json({ success: true, data: session.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function cancelSessionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await strengthSessionService.cancelSession(
      req.userId!,
      p(req.params.id)
    );
    res.status(200).json({ success: true, data: session.toJSON() });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// EXERCÍCIOS
// ==========================================

export async function addExerciseController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await strengthSessionService.addExercise(
      req.userId!,
      p(req.params.id),
      req.body as AddExerciseInput
    );
    res.status(200).json({ success: true, data: session.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function removeExerciseController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await strengthSessionService.removeExercise(
      req.userId!,
      p(req.params.id),
      p(req.params.exerciseId)
    );
    res.status(200).json({ success: true, data: session.toJSON() });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// SÉRIES
// ==========================================

export async function addSetController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await strengthSessionService.addSet(
      req.userId!,
      p(req.params.id),
      req.body as AddSetInput
    );
    res.status(200).json({ success: true, data: session.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function completeSetController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await strengthSessionService.completeSet(
      req.userId!,
      p(req.params.id),
      req.body as CompleteSetInput
    );
    res.status(200).json({ success: true, data: session.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function editSetController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await strengthSessionService.editSet(
      req.userId!,
      p(req.params.id),
      p(req.params.exerciseId),
      p(req.params.setId),
      req.body as EditSetInput
    );
    res.status(200).json({ success: true, data: session.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function removeSetController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await strengthSessionService.removeSet(
      req.userId!,
      p(req.params.id),
      p(req.params.exerciseId),
      p(req.params.setId)
    );
    res.status(200).json({ success: true, data: session.toJSON() });
  } catch (error) {
    next(error);
  }
}
