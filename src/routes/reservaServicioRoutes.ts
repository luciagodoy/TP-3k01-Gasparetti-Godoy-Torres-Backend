import { Router } from 'express';
import {
  crearReservaServicio,
  listarReservaServicio,
  obtenerReservaServicio,
  actualizarReservaServicio,
  eliminarReservaServicio
} from '../controllers/controladorReservaServicio';

const router = Router();

router.post('/', crearReservaServicio);
router.get('/', listarReservaServicio);
router.get('/:id', obtenerReservaServicio);
router.put('/:id', actualizarReservaServicio);
router.delete('/:id', eliminarReservaServicio);

export default router;
