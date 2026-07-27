import { Router } from 'express';
import {
  crearServicio,
  listarServicios,
  obtenerServicio,
  actualizarServicio,
  eliminarServicio
} from '../controllers/controladorServicio';

const router = Router();

router.post('/', crearServicio);
router.get('/', listarServicios);
router.get('/:id', obtenerServicio);
router.put('/:id', actualizarServicio);
router.delete('/:id', eliminarServicio);

export default router;
