import { Router } from 'express';
import { listarHabitacionesFiltradas } from '../controllers/controladorHabitacion';

const router = Router();

router.get('/', listarHabitacionesFiltradas);

export default router;