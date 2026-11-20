import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { InjuryController } from './injury.controller.js';

const router = Router();
const controller = new InjuryController();

router.use(requireAuth);
router.get('/', controller.list.bind(controller));
router.post('/', controller.create.bind(controller));
router.patch('/:id', controller.update.bind(controller));
router.delete('/:id', controller.remove.bind(controller));

export const injuryRoutes = router;
