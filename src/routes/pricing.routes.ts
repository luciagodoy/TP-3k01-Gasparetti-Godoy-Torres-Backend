import {Router} from 'express';
import {pricingController} from '../controllers/pricing.controller';

const router = Router();

// Público, como la búsqueda de habitaciones: cualquiera que navegue puede ver el precio de una estadía.
router.get('/quote', pricingController.quote);

export default router;
