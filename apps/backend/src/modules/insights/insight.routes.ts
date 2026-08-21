import { Router } from 'express';
import { insightController } from './insight.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);

router.get('/', insightController.listInsights);
router.get('/daily', insightController.getDailyInsight);
router.get('/session/:sessionId', insightController.getSessionInsight);
router.post('/session/:sessionId/generate', insightController.generateSessionInsight);

export default router;
