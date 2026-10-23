import {Router} from 'express';
import {reservationController} from '../controllers/reservation.controller';
import auth from '../middleware/auth';

const router = Router();

// Autoservicio del huésped. Se declara antes de '/:id' para que "mine" no se lea como un id.
router.post('/mine', auth.simple, reservationController.createMine);
router.get('/mine', auth.simple, reservationController.listMine);
router.post('/:id/cancel', auth.simple, reservationController.cancelMine);

// Staff.
router.post('/', auth.staff, reservationController.create);
router.get('/', auth.staff, reservationController.list);
router.get('/:id', auth.staff, reservationController.getById);
router.put('/:id', auth.staff, reservationController.update);
router.delete('/:id', auth.staff, reservationController.remove);
router.post('/:id/check-in', auth.staff, reservationController.checkIn);
router.post('/:id/check-out', auth.staff, reservationController.checkOut);
router.get('/:id/receipt', auth.staff, reservationController.downloadReceipt);

export default router;
