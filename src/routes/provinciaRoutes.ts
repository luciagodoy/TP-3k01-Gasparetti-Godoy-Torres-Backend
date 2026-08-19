import { Router } from 'express';
import {
  crearProvincia,
  listarProvincias,
  obtenerProvincia,
  actualizarProvincia,
  eliminarProvincia
} from '../controllers/controladorProvincia';
import auth from '../middleware/auth';

const router = Router();

router.get('/', listarProvincias);
router.get('/:id', obtenerProvincia);
router.post('/', auth.enhance, crearProvincia);
router.put('/:id', auth.enhance, actualizarProvincia);
router.delete('/:id', auth.enhance, eliminarProvincia);

export default router;
