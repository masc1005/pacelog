import { Router } from 'express';
import { insightController } from './insight.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);

router.get('/daily', insightController.getDailyInsight);

export default router;
