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
router.post('/', auth.admin, crearUsuario);
router.get('/', auth.admin, listarUsuarios);
router.get('/:id', auth.admin, obtenerUsuario);
router.put('/:id', auth.admin, actualizarUsuario);
router.delete('/:id', auth.admin, eliminarUsuario);

export default router;
