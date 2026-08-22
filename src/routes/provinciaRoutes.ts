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
router.post('/', auth.staff, crearProvincia);
router.put('/:id', auth.staff, actualizarProvincia);
router.delete('/:id', auth.staff, eliminarProvincia);

export default router;
