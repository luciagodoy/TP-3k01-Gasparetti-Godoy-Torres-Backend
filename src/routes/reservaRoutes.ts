import { Router } from 'express';
import {
  crearReserva,
  listarReservas,
  obtenerReserva,
  actualizarReserva,
  eliminarReserva,
  realizarCheckIn,
  realizarCheckOut,
  descargarComprobante
} from '../controllers/controladorReserva';

const router = Router();

router.post('/', crearReserva);
router.get('/', listarReservas);
router.get('/:id', obtenerReserva);
router.put('/:id', actualizarReserva);
router.delete('/:id', eliminarReserva);
router.post('/:id/checkin', realizarCheckIn);
router.post('/:id/checkout', realizarCheckOut);
router.get('/:id/comprobante', descargarComprobante);

export default router;
