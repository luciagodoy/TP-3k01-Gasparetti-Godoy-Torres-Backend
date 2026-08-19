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

router.post('/', auth.enhance, crearReservaServicio);
router.get('/', auth.enhance, listarReservaServicio);
router.get('/:id', auth.enhance, obtenerReservaServicio);
router.put('/:id', auth.enhance, actualizarReservaServicio);
router.delete('/:id', auth.enhance, eliminarReservaServicio);

export default router;
