import {Request, Response} from 'express';
import {amenityQuotaService, AmenityQuotaInput} from '../services/amenity-quota.service';
import {optionalNumber, parseId} from '../shared/http';

export const amenityQuotaController = {
  async list(req: Request<{}, {}, {}, {amenityId?: string}>, res: Response): Promise<void> {
    res.json(await amenityQuotaService.list(optionalNumber(req.query.amenityId)));
  },

  async getById(req: Request<{id: string}>, res: Response): Promise<void> {
    res.json(await amenityQuotaService.getWithAmenity(parseId(req.params.id)));
  },

  async create(req: Request<{}, {}, AmenityQuotaInput>, res: Response): Promise<void> {
    res.status(201).json(await amenityQuotaService.create(req.body));
  },

  async update(req: Request<{id: string}, {}, Partial<AmenityQuotaInput>>, res: Response): Promise<void> {
    res.json(await amenityQuotaService.update(parseId(req.params.id), req.body));
  },

  async remove(req: Request<{id: string}>, res: Response): Promise<void> {
    await amenityQuotaService.remove(parseId(req.params.id));
    res.status(204).send();
  }
};
