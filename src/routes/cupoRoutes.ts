import { Router } from 'express';
import {
  crearCupo,
  listarCupos,
  obtenerCupo,
  actualizarCupo,
  eliminarCupo
} from '../controllers/controladorCupo';
import auth from '../middleware/auth';

const router = Router();

router.get('/', listarCupos);
router.get('/:id', obtenerCupo);
router.post('/', auth.staff, crearCupo);
router.put('/:id', auth.staff, actualizarCupo);
router.delete('/:id', auth.staff, eliminarCupo);

export default router;
