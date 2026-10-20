import {Router} from 'express';
import {authController} from '../controllers/auth.controller';
import {loginLimiter} from '../middleware/rate-limit';

const router = Router();

router.post('/login', loginLimiter, authController.login);

export default router;
