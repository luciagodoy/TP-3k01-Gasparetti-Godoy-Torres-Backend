import { Router } from 'express';
import {
  listarHabitacionesFiltradas,
  crearHabitacion,
  obtenerHabitacion,
  actualizarHabitacion,
  eliminarHabitacion
} from '../controllers/controladorHabitacion';
import auth from '../middleware/auth';

const router = Router();

router.get('/', listarHabitacionesFiltradas);
router.get('/:id', obtenerHabitacion);
router.post('/', auth.enhance, crearHabitacion);
router.put('/:id', auth.enhance, actualizarHabitacion);
router.delete('/:id', auth.enhance, eliminarHabitacion);

export default router;
