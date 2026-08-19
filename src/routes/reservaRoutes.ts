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

router.post('/', auth.enhance, crearReserva);
router.get('/', auth.enhance, listarReservas);
router.get('/:id', auth.enhance, obtenerReserva);
router.put('/:id', auth.enhance, actualizarReserva);
router.delete('/:id', auth.enhance, eliminarReserva);
router.post('/:id/checkin', auth.enhance, realizarCheckIn);
router.post('/:id/checkout', auth.enhance, realizarCheckOut);
router.get('/:id/comprobante', auth.enhance, descargarComprobante);

export default router;
