import {Router} from 'express';
import {roomCategoryController} from '../controllers/room-category.controller';
import auth from '../middleware/auth';

const router = Router();

router.get('/', roomCategoryController.list);
router.get('/:id', roomCategoryController.getById);
router.post('/', auth.staff, roomCategoryController.create);
router.put('/:id', auth.staff, roomCategoryController.update);
router.delete('/:id', auth.staff, roomCategoryController.remove);

export default router;
