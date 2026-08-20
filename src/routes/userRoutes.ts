import { Router } from 'express';
import {
  crearUsuario,
  listarUsuarios,
  obtenerUsuario,
  actualizarUsuario,
  eliminarUsuario
} from '../controllers/controladorUser';
import auth from '../middleware/auth';

const router = Router();

router.post('/', auth.admin, crearUsuario);
router.get('/', auth.admin, listarUsuarios);
router.get('/:id', auth.admin, obtenerUsuario);
router.put('/:id', auth.admin, actualizarUsuario);
router.delete('/:id', auth.admin, eliminarUsuario);

export default router;
