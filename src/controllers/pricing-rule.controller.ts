import {Request, Response} from 'express';
import {pricingRuleService, PricingRuleInput} from '../services/pricing-rule.service';
import {optionalNumber, parseId} from '../shared/http';

export const pricingRuleController = {
  async list(req: Request<{}, {}, {}, {categoryId?: string}>, res: Response): Promise<void> {
    res.json(await pricingRuleService.list(optionalNumber(req.query.categoryId)));
  },

  async getById(req: Request<{id: string}>, res: Response): Promise<void> {
    res.json(await pricingRuleService.getWithCategory(parseId(req.params.id)));
  },

  async create(req: Request<{}, {}, PricingRuleInput>, res: Response): Promise<void> {
    res.status(201).json(await pricingRuleService.create(req.body));
  },

  async update(req: Request<{id: string}, {}, Partial<PricingRuleInput>>, res: Response): Promise<void> {
    res.json(await pricingRuleService.update(parseId(req.params.id), req.body));
  },

  async remove(req: Request<{id: string}>, res: Response): Promise<void> {
    await pricingRuleService.remove(parseId(req.params.id));
    res.status(204).send();
  }
};
