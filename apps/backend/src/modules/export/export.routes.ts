import { Router } from 'express';
import { exportController } from './export.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);

router.get('/sessions.csv', exportController.exportSessionsCSV);
router.get('/sessions.json', exportController.exportSessionsJSON);
router.get('/weekly-report', exportController.getWeeklyReport);

export default router;
