import {Request, Response} from 'express';
import {amenityService, AmenityInput} from '../services/amenity.service';
import {parseId} from '../shared/http';

export const amenityController = {
  async list(_req: Request, res: Response): Promise<void> {
    res.json(await amenityService.list());
  },

  async getById(req: Request<{id: string}>, res: Response): Promise<void> {
    res.json(await amenityService.getById(parseId(req.params.id)));
  },

  async create(req: Request<{}, {}, AmenityInput>, res: Response): Promise<void> {
    res.status(201).json(await amenityService.create(req.body));
  },

  async update(req: Request<{id: string}, {}, Partial<AmenityInput>>, res: Response): Promise<void> {
    res.json(await amenityService.update(parseId(req.params.id), req.body));
  },

  async remove(req: Request<{id: string}>, res: Response): Promise<void> {
    await amenityService.remove(parseId(req.params.id));
    res.status(204).send();
  }
};
