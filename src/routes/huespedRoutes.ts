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
router.get('/', auth.staff, listarHuespedes);
router.get('/:id', auth.staff, obtenerHuesped);
router.put('/:id', auth.staff, actualizarHuesped);
router.delete('/:id', auth.staff, eliminarHuesped);

export default router;
