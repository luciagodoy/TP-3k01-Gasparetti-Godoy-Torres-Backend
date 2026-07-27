import { Router } from 'express';
import {
  registrarHuesped,
  listarHuespedes,
  obtenerHuesped,
  actualizarHuesped,
  eliminarHuesped
} from '../controllers/controladorHuesped';

const router = Router();

router.post('/registro', registrarHuesped);
router.get('/', listarHuespedes);
router.get('/:id', obtenerHuesped);
router.put('/:id', actualizarHuesped);
router.delete('/:id', eliminarHuesped);

export default router;
