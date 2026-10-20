import {Router} from 'express';
import {guestController} from '../controllers/guest.controller';
import auth from '../middleware/auth';
import {registrationLimiter} from '../middleware/rate-limit';

const router = Router();

router.post('/register', registrationLimiter, guestController.register);
router.get('/me', auth.simple, guestController.getMyProfile);
router.get('/', auth.staff, guestController.list);
router.get('/:id', auth.staff, guestController.getById);
router.put('/:id', auth.staff, guestController.update);
router.delete('/:id', auth.staff, guestController.remove);

export default router;
