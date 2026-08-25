import { Router } from 'express';
import { ShoeController } from './shoe.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = Router();
const controller = new ShoeController();

router.use(requireAuth);

router.get('/', controller.getShoes);
router.get('/:id', controller.getShoeById);
router.post('/', controller.createShoe);
router.patch('/:id', controller.updateShoe);
router.post('/:id/set-default', controller.setDefault);
router.post('/:id/retire', controller.retireShoe);
router.post('/:id/archive', controller.archiveShoe);

export const shoeRoutes = router;
