import { Router } from 'express';
import {
  crearEmpleado,
  listarEmpleados,
  obtenerEmpleado,
  actualizarEmpleado,
  eliminarEmpleado
} from '../controllers/controladorEmpleado';
import auth from '../middleware/auth';

const router = Router();

router.post('/', auth.admin, crearEmpleado);
router.get('/', auth.admin, listarEmpleados);
router.get('/:id', auth.admin, obtenerEmpleado);
router.put('/:id', auth.admin, actualizarEmpleado);
router.delete('/:id', auth.admin, eliminarEmpleado);

export default router;
