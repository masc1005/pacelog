import type { Request, Response, NextFunction } from 'express';
import { sessionService } from './session.service.js';
import type {
  CreateSessionInput,
  UpdateSessionInput,
  ListSessionsQuery,
  SessionSummaryQuery,
} from './session.schemas.js';

export async function createSessionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const input = req.body as CreateSessionInput;

    const session = await sessionService.createOrUpsertSession(userId, input);

    res.status(201).json({
      success: true,
      data: {
        ...session.toJSON(),
        id: session._id.toString()
      },
    });
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
    const query = req.query as unknown as ListSessionsQuery;

    const result = await sessionService.listSessions(userId, query);

    const mappedItems = result.items.map(item => {
      const doc = item.toJSON();
      return {
        ...doc,
        id: item._id.toString(),
      };
    });

    res.status(200).json({
      success: true,
      data: mappedItems,
      pagination: result.pagination,
    });
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
    const id = String(req.params.id);

    const session = await sessionService.getSessionById(userId, id);

    res.status(200).json({
      success: true,
      data: {
        ...session.toJSON(),
        id: session._id.toString()
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSessionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);
    const input = req.body as UpdateSessionInput;

    const session = await sessionService.updateSession(userId, id, input);

    res.status(200).json({
      success: true,
      data: {
        ...session.toJSON(),
        id: session._id.toString()
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteSessionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);

    await sessionService.deleteSession(userId, id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getSessionSummaryController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const query = req.query as unknown as SessionSummaryQuery;

    const summary = await sessionService.getSessionSummary(userId, query);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}
