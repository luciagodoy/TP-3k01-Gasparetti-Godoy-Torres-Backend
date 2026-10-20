import {Request, Response} from 'express';
import {amenityPriceService, AmenityPriceInput} from '../services/amenity-price.service';
import {optionalNumber, parseId} from '../shared/http';

interface ListPricesQuery {
  amenityId?: string;
  current?: string;
}

export const amenityPriceController = {
  async list(req: Request<{}, {}, {}, ListPricesQuery>, res: Response): Promise<void> {
    const {amenityId, current} = req.query;
    res.json(await amenityPriceService.list(optionalNumber(amenityId), current === 'true'));
  },

  async getById(req: Request<{id: string}>, res: Response): Promise<void> {
    res.json(await amenityPriceService.getWithAmenity(parseId(req.params.id)));
  },

  async create(req: Request<{}, {}, AmenityPriceInput>, res: Response): Promise<void> {
    res.status(201).json(await amenityPriceService.create(req.body));
  },

  async update(req: Request<{id: string}, {}, Partial<AmenityPriceInput>>, res: Response): Promise<void> {
    res.json(await amenityPriceService.update(parseId(req.params.id), req.body));
  },

  async remove(req: Request<{id: string}>, res: Response): Promise<void> {
    await amenityPriceService.remove(parseId(req.params.id));
    res.status(204).send();
  }
};
