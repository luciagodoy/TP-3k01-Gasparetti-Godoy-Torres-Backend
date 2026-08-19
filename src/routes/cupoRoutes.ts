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
router.post('/', auth.enhance, crearCupo);
router.put('/:id', auth.enhance, actualizarCupo);
router.delete('/:id', auth.enhance, eliminarCupo);

export default router;
