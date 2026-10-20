import {Router} from 'express';
import {pricingController} from '../controllers/pricing.controller';

const router = Router();

// Public, like the room search: anyone browsing can see the price of a stay.
router.get('/quote', pricingController.quote);

export default router;
