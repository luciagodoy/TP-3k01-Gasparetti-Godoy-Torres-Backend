import {Router} from 'express';
import {employeeController} from '../controllers/employee.controller';
import auth from '../middleware/auth';

const router = Router();

router.get('/', auth.admin, employeeController.list);
router.get('/:id', auth.admin, employeeController.getById);
router.post('/', auth.admin, employeeController.create);
router.put('/:id', auth.admin, employeeController.update);
router.delete('/:id', auth.admin, employeeController.remove);

export default router;
