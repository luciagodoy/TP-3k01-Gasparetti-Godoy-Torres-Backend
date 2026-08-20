import { Router } from 'express';
import {
  crearPrecioServicio,
  listarPreciosServicio,
  obtenerPrecioServicio,
  actualizarPrecioServicio,
  eliminarPrecioServicio
} from '../controllers/controladorPrecioServicio';
import auth from '../middleware/auth';

const router = Router();

router.get('/', listarPreciosServicio);
router.get('/:id', obtenerPrecioServicio);
router.post('/', auth.staff, crearPrecioServicio);
router.put('/:id', auth.staff, actualizarPrecioServicio);
router.delete('/:id', auth.staff, eliminarPrecioServicio);

export default router;
