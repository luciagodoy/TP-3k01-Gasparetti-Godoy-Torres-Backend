import {Router} from 'express';
import {cityController} from '../controllers/city.controller';
import auth from '../middleware/auth';

const router = Router();

router.get('/', cityController.list);
router.get('/:id', cityController.getById);
router.post('/', auth.staff, cityController.create);
router.put('/:id', auth.staff, cityController.update);
router.delete('/:id', auth.staff, cityController.remove);

export default router;
