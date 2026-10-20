import {Router} from 'express';
import {amenityController} from '../controllers/amenity.controller';
import auth from '../middleware/auth';

const router = Router();

router.get('/', amenityController.list);
router.get('/:id', amenityController.getById);
router.post('/', auth.staff, amenityController.create);
router.put('/:id', auth.staff, amenityController.update);
router.delete('/:id', auth.staff, amenityController.remove);

export default router;
