import { Router } from 'express';
import {
  crearCupo,
  listarCupos,
  obtenerCupo,
  actualizarCupo,
  eliminarCupo
} from '../controllers/controladorCupo';

const router = Router();

router.post('/', crearCupo);
router.get('/', listarCupos);
router.get('/:id', obtenerCupo);
router.put('/:id', actualizarCupo);
router.delete('/:id', eliminarCupo);

export default router;
