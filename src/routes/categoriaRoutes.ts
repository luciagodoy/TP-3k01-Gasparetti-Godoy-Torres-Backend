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
router.post('/', auth.staff, crearCategoria);
router.put('/:id', auth.staff, actualizarCategoria);
router.delete('/:id', auth.staff, eliminarCategoria);

export default router;
