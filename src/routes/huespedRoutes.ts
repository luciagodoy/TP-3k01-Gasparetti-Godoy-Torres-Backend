import { Router } from 'express';
import {
  registrarHuesped,
  listarHuespedes,
  obtenerMiPerfilHuesped,
  obtenerHuesped,
  actualizarHuesped,
  eliminarHuesped
} from '../controllers/controladorHuesped';
import auth from '../middleware/auth';

const router = Router();

router.post('/registro', registrarHuesped);
router.get('/', listarHuespedes);
router.get('/me', auth.simple, obtenerMiPerfilHuesped);
router.get('/:id', obtenerHuesped);
router.put('/:id', actualizarHuesped);
router.delete('/:id', eliminarHuesped);

export default router;
