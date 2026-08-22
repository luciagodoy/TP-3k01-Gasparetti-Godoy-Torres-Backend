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

router.post('/', auth.staff, crearReservaServicio);
router.get('/', auth.staff, listarReservaServicio);
router.get('/:id', auth.staff, obtenerReservaServicio);
router.put('/:id', auth.staff, actualizarReservaServicio);
router.delete('/:id', auth.staff, eliminarReservaServicio);

export default router;
