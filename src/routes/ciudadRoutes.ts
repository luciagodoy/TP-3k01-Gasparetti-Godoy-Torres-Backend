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
router.post('/', auth.staff, crearCiudad);
router.put('/:id', auth.staff, actualizarCiudad);
router.delete('/:id', auth.staff, eliminarCiudad);

export default router;
