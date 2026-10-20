import {Router} from 'express';
import {amenityQuotaController} from '../controllers/amenity-quota.controller';
import auth from '../middleware/auth';

const router = Router();

router.get('/', amenityQuotaController.list);
router.get('/:id', amenityQuotaController.getById);
router.post('/', auth.staff, amenityQuotaController.create);
router.put('/:id', auth.staff, amenityQuotaController.update);
router.delete('/:id', auth.staff, amenityQuotaController.remove);

export default router;
