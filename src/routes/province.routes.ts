import {Router} from 'express';
import {provinceController} from '../controllers/province.controller';
import auth from '../middleware/auth';

const router = Router();

router.get('/', provinceController.list);
router.get('/:id', provinceController.getById);
router.post('/', auth.staff, provinceController.create);
router.put('/:id', auth.staff, provinceController.update);
router.delete('/:id', auth.staff, provinceController.remove);

export default router;
