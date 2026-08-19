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
router.get('/me', auth.simple, obtenerMiPerfilHuesped);

router.get('/', auth.enhance, listarHuespedes);
router.get('/:id', auth.enhance, obtenerHuesped);
router.put('/:id', auth.enhance, actualizarHuesped);
router.delete('/:id', auth.enhance, eliminarHuesped);

export default router;
