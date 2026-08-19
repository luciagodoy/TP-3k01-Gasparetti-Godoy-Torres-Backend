import { Router } from 'express';
import {
  crearReservaServicio,
  crearReservaServicioPropio,
  listarReservaServicio,
  obtenerReservaServicio,
  actualizarReservaServicio,
  eliminarReservaServicio
} from '../controllers/controladorReservaServicio';
import auth from '../middleware/auth';

const router = Router();

router.post('/mias', auth.simple, crearReservaServicioPropio);

router.post('/', crearReservaServicio);
router.get('/', listarReservaServicio);
router.get('/:id', obtenerReservaServicio);
router.put('/:id', actualizarReservaServicio);
router.delete('/:id', eliminarReservaServicio);

export default router;
