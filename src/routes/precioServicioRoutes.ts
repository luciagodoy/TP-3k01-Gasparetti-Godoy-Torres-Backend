import { Router } from 'express';
import {
  crearPrecioServicio,
  listarPreciosServicio,
  obtenerPrecioServicio,
  actualizarPrecioServicio,
  eliminarPrecioServicio
} from '../controllers/controladorPrecioServicio';

const router = Router();

router.post('/', crearPrecioServicio);
router.get('/', listarPreciosServicio);
router.get('/:id', obtenerPrecioServicio);
router.put('/:id', actualizarPrecioServicio);
router.delete('/:id', eliminarPrecioServicio);

export default router;
