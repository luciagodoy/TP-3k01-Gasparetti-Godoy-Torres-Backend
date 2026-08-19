import { Router } from 'express';
import {
  crearServicio,
  listarServicios,
  obtenerServicio,
  actualizarServicio,
  eliminarServicio
} from '../controllers/controladorServicio';
import auth from '../middleware/auth';

const router = Router();

router.get('/', listarServicios);
router.get('/:id', obtenerServicio);
router.post('/', auth.enhance, crearServicio);
router.put('/:id', auth.enhance, actualizarServicio);
router.delete('/:id', auth.enhance, eliminarServicio);

export default router;
