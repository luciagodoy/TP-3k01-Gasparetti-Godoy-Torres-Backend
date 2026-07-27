import { Router } from 'express';
import {
  crearProvincia,
  listarProvincias,
  obtenerProvincia,
  actualizarProvincia,
  eliminarProvincia
} from '../controllers/controladorProvincia';

const router = Router();

router.post('/', crearProvincia);
router.get('/', listarProvincias);
router.get('/:id', obtenerProvincia);
router.put('/:id', actualizarProvincia);
router.delete('/:id', eliminarProvincia);

export default router;
