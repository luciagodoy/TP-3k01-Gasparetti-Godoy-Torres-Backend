import { Router } from 'express';
import {
  crearCiudad,
  listarCiudades,
  obtenerCiudad,
  actualizarCiudad,
  eliminarCiudad
} from '../controllers/controladorCiudad';
import auth from '../middleware/auth';

const router = Router();

router.get('/', listarCiudades);
router.get('/:id', obtenerCiudad);
router.post('/', auth.enhance, crearCiudad);
router.put('/:id', auth.enhance, actualizarCiudad);
router.delete('/:id', auth.enhance, eliminarCiudad);

export default router;
