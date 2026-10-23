import {Router} from 'express';
import {reservationAmenityController} from '../controllers/reservation-amenity.controller';
import auth from '../middleware/auth';

const router = Router();

// Autoservicio del huésped.
router.post('/mine', auth.simple, reservationAmenityController.createMine);

// Staff.
router.post('/', auth.staff, reservationAmenityController.create);
router.get('/', auth.staff, reservationAmenityController.list);
router.get('/:id', auth.staff, reservationAmenityController.getById);
router.put('/:id', auth.staff, reservationAmenityController.update);
router.delete('/:id', auth.staff, reservationAmenityController.remove);

export default router;
