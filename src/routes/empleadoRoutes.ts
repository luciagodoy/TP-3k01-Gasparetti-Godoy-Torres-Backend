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

router.use(auth.enhance);

router.post('/', crearEmpleado);
router.get('/', listarEmpleados);
router.get('/:id', obtenerEmpleado);
router.put('/:id', actualizarEmpleado);
router.delete('/:id', eliminarEmpleado);

export default router;
