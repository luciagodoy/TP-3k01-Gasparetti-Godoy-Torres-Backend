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
router.post('/', auth.staff, crearServicio);
router.put('/:id', auth.staff, actualizarServicio);
router.delete('/:id', auth.staff, eliminarServicio);

export default router;
