import {Router} from 'express';
import {userController} from '../controllers/user.controller';
import auth from '../middleware/auth';

// Account management is admin-only.
const router = Router();

router.get('/', auth.admin, userController.list);
router.get('/:id', auth.admin, userController.getById);
router.post('/', auth.admin, userController.create);
router.put('/:id', auth.admin, userController.update);
router.delete('/:id', auth.admin, userController.remove);

export default router;
