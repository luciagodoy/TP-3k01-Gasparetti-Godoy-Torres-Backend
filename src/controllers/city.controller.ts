import {Request, Response} from 'express';
import {cityService, CityInput} from '../services/city.service';
import {optionalNumber, parseId} from '../shared/http';

export const cityController = {
  async list(req: Request<{}, {}, {}, {provinceId?: string}>, res: Response): Promise<void> {
    res.json(await cityService.list(optionalNumber(req.query.provinceId)));
  },

  async getById(req: Request<{id: string}>, res: Response): Promise<void> {
    res.json(await cityService.getWithProvince(parseId(req.params.id)));
  },

  async create(req: Request<{}, {}, CityInput>, res: Response): Promise<void> {
    res.status(201).json(await cityService.create(req.body));
  },

  async update(req: Request<{id: string}, {}, Partial<CityInput>>, res: Response): Promise<void> {
    res.json(await cityService.update(parseId(req.params.id), req.body));
  },

  async remove(req: Request<{id: string}>, res: Response): Promise<void> {
    await cityService.remove(parseId(req.params.id));
    res.status(204).send();
  }
};
