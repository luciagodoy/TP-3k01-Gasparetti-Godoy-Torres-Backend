import { Router } from 'express';
import { crearReserva } from '../controllers/controladorReserva';

const router = Router();

router.post('/', crearReserva);

export default router;