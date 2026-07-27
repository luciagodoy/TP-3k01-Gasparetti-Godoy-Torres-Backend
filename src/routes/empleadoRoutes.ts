import { Router } from 'express';
import {
  crearEmpleado,
  listarEmpleados,
  obtenerEmpleado,
  actualizarEmpleado,
  eliminarEmpleado
} from '../controllers/controladorEmpleado';

const router = Router();

router.post('/', crearEmpleado);
router.get('/', listarEmpleados);
router.get('/:id', obtenerEmpleado);
router.put('/:id', actualizarEmpleado);
router.delete('/:id', eliminarEmpleado);

export default router;
