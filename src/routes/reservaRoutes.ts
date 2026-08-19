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

router.post('/', crearReserva);
router.get('/', listarReservas);
router.get('/:id', obtenerReserva);
router.put('/:id', actualizarReserva);
router.delete('/:id', eliminarReserva);
router.post('/:id/checkin', realizarCheckIn);
router.post('/:id/checkout', realizarCheckOut);
router.get('/:id/comprobante', descargarComprobante);

export default router;
