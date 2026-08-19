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

// Gestión de cuentas: solo administradores. El primer admin se crea vía seed
// (ver src/config/seedAdmin.ts), no a través de esta API.
router.use(auth.enhance);

router.post('/', crearUsuario);
router.get('/', listarUsuarios);
router.get('/:id', obtenerUsuario);
router.put('/:id', actualizarUsuario);
router.delete('/:id', eliminarUsuario);

export default router;
