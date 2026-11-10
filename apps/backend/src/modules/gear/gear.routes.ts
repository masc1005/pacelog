import { Router } from 'express';
import { GearController } from './gear.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = Router();
const controller = new GearController();

router.use(requireAuth);

router.get('/', controller.getGear);
router.get('/:id', controller.getGearById);
router.post('/', controller.createGear);
router.patch('/:id', controller.updateGear);
router.post('/:id/set-default', controller.setDefault);
router.post('/:id/retire', controller.retireGear);
router.post('/:id/archive', controller.archiveGear);

// Componentes de bicicleta (corrente, pneus...)
router.post('/:id/components', controller.addComponent);
router.post('/:id/components/:componentId/replace', controller.replaceComponent);
router.delete('/:id/components/:componentId', controller.removeComponent);

export const gearRoutes = router;
