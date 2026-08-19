import { Router } from 'express';
import {
  crearCategoria,
  listarCategorias,
  obtenerCategoria,
  actualizarCategoria,
  eliminarCategoria
} from '../controllers/controladorCategoriaHabitacion';
import auth from '../middleware/auth';

const router = Router();

router.get('/', listarCategorias);
router.get('/:id', obtenerCategoria);
router.post('/', auth.enhance, crearCategoria);
router.put('/:id', auth.enhance, actualizarCategoria);
router.delete('/:id', auth.enhance, eliminarCategoria);

export default router;
