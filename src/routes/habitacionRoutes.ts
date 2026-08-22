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
router.post('/', auth.staff, crearHabitacion);
router.put('/:id', auth.staff, actualizarHabitacion);
router.delete('/:id', auth.staff, eliminarHabitacion);

export default router;
