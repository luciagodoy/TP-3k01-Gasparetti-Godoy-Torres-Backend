import { Router } from 'express';
import {
  crearCategoria,
  listarCategorias,
  obtenerCategoria,
  actualizarCategoria,
  eliminarCategoria
} from '../controllers/controladorCategoriaHabitacion';

const router = Router();

router.post('/', crearCategoria);
router.get('/', listarCategorias);
router.get('/:id', obtenerCategoria);
router.put('/:id', actualizarCategoria);
router.delete('/:id', eliminarCategoria);

export default router;
