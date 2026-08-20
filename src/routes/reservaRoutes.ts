import { Router } from 'express';
import {
  crearReserva,
  listarReservas,
  obtenerReserva,
  actualizarReserva,
  eliminarReserva,
  realizarCheckIn,
  realizarCheckOut,
  descargarComprobante,
  crearReservaPropia,
  listarMisReservas,
  cancelarReservaPropia
} from '../controllers/controladorReserva';
import auth from '../middleware/auth';

const router = Router();

router.post('/mias', auth.simple, crearReservaPropia);
router.get('/mias', auth.simple, listarMisReservas);
router.post('/:id/cancelar', auth.simple, cancelarReservaPropia);

router.post('/', auth.staff, crearReserva);
router.get('/', auth.staff, listarReservas);
router.get('/:id', auth.staff, obtenerReserva);
router.put('/:id', auth.staff, actualizarReserva);
router.delete('/:id', auth.staff, eliminarReserva);
router.post('/:id/checkin', auth.staff, realizarCheckIn);
router.post('/:id/checkout', auth.staff, realizarCheckOut);
router.get('/:id/comprobante', auth.staff, descargarComprobante);

export default router;
