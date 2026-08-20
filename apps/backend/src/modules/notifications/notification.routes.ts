import { Router } from 'express';
import { notificationController } from './notification.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);

router.get('/', notificationController.listNotifications);
router.post('/check', notificationController.checkAlerts);
router.patch('/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

export default router;
