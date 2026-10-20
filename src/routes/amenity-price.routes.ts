import {Router} from 'express';
import {amenityPriceController} from '../controllers/amenity-price.controller';
import auth from '../middleware/auth';

const router = Router();

router.get('/', amenityPriceController.list);
router.get('/:id', amenityPriceController.getById);
router.post('/', auth.staff, amenityPriceController.create);
router.put('/:id', auth.staff, amenityPriceController.update);
router.delete('/:id', auth.staff, amenityPriceController.remove);

export default router;
