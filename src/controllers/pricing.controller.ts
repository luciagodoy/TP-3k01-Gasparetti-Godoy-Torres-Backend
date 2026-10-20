import {Request, Response} from 'express';
import {pricingService} from '../services/pricing.service';
import {optionalNumber} from '../shared/http';

interface QuoteQuery {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
}

export const pricingController = {
  async quote(req: Request<{}, {}, {}, QuoteQuery>, res: Response): Promise<void> {
    const {startDate, endDate, categoryId} = req.query;
    res.json(await pricingService.quote(startDate ?? '', endDate ?? '', optionalNumber(categoryId)));
  }
};
