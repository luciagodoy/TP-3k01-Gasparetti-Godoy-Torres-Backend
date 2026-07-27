import { Router } from 'express';
import {
  listarHabitacionesFiltradas,
  crearHabitacion,
  obtenerHabitacion,
  actualizarHabitacion,
  eliminarHabitacion
} from '../controllers/controladorHabitacion';

const router = Router();

router.get('/', listarHabitacionesFiltradas);
router.post('/', crearHabitacion);
router.get('/:id', obtenerHabitacion);
router.put('/:id', actualizarHabitacion);
router.delete('/:id', eliminarHabitacion);

export default router;
