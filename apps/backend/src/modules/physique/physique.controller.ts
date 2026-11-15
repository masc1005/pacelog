import type { Request, Response, NextFunction } from 'express';
import type {
  CreatePhysiqueAssessmentInput,
  GeneratePhysiquePlanInput,
} from '@pacelog/shared';
import { physiqueService } from './physique.service.js';
import { HttpError } from '../../utils/httpError.js';

function getParamId(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] : (val ?? '');
}

export async function assessPhysiqueController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.userId) {
      throw new HttpError(401, 'UNAUTHORIZED');
    }
    const input = req.body as CreatePhysiqueAssessmentInput;
    const assessment = await physiqueService.assessPhysique(req.userId, input);
    res.status(201).json({ success: true, data: assessment.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function listAssessmentsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.userId) {
      throw new HttpError(401, 'UNAUTHORIZED');
    }
    const items = await physiqueService.listAssessments(req.userId);
    res.status(200).json({
      success: true,
      data: items.map((i) => i.toJSON()),
    });
  } catch (error) {
    next(error);
  }
}

export async function getAssessmentByIdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.userId) {
      throw new HttpError(401, 'UNAUTHORIZED');
    }
    const id = getParamId(req.params.id);
    const assessment = await physiqueService.getAssessmentById(req.userId, id);
    res.status(200).json({ success: true, data: assessment.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function generateCorrectionPlanController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.userId) {
      throw new HttpError(401, 'UNAUTHORIZED');
    }
    const id = getParamId(req.params.id);
    const options = (req.body || {}) as GeneratePhysiquePlanInput;
    const result = await physiqueService.generateCorrectionPlan(req.userId, id, options);
    res.status(201).json({
      success: true,
      data: {
        summary: result.summary,
        routines: result.routines.map((r) => r.toJSON()),
      },
    });
  } catch (error) {
    next(error);
  }
}
