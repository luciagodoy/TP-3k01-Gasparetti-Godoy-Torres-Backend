import { Router } from 'express';
import { registrarHuesped } from '../controllers/controladorHuesped';

const router = Router();

router.post('/registro', registrarHuesped);

export default router;