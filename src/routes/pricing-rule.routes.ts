import {Router} from 'express';
import {pricingRuleController} from '../controllers/pricing-rule.controller';
import auth from '../middleware/auth';

const router = Router();

// Revenue management: only the staff sees and edits the tiers.
router.get('/', auth.staff, pricingRuleController.list);
router.get('/:id', auth.staff, pricingRuleController.getById);
router.post('/', auth.staff, pricingRuleController.create);
router.put('/:id', auth.staff, pricingRuleController.update);
router.delete('/:id', auth.staff, pricingRuleController.remove);

export default router;
