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
router.post('/', auth.enhance, crearPrecioServicio);
router.put('/:id', auth.enhance, actualizarPrecioServicio);
router.delete('/:id', auth.enhance, eliminarPrecioServicio);

export default router;
