import { Router } from 'express';
import {
  crearCiudad,
  listarCiudades,
  obtenerCiudad,
  actualizarCiudad,
  eliminarCiudad
} from '../controllers/controladorCiudad';

const router = Router();

router.post('/', crearCiudad);
router.get('/', listarCiudades);
router.get('/:id', obtenerCiudad);
router.put('/:id', actualizarCiudad);
router.delete('/:id', eliminarCiudad);

export default router;
