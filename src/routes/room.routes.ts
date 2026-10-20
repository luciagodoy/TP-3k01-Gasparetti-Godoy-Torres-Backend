import {Router} from 'express';
import {roomController} from '../controllers/room.controller';
import auth from '../middleware/auth';

const router = Router();

// Public: guests search availability without logging in.
router.get('/', roomController.search);
router.get('/:id', roomController.getById);
router.post('/', auth.staff, roomController.create);
router.put('/:id', auth.staff, roomController.update);
router.delete('/:id', auth.staff, roomController.remove);

export default router;
