import {Request, Response} from 'express';
import {provinceService, ProvinceInput} from '../services/province.service';
import {parseId} from '../shared/http';

// Controllers only deal with HTTP: read the request, call the service, send the
// response. Errors propagate to the error-handler middleware.
export const provinceController = {
  async list(_req: Request, res: Response): Promise<void> {
    res.json(await provinceService.list());
  },

  async getById(req: Request<{id: string}>, res: Response): Promise<void> {
    res.json(await provinceService.getById(parseId(req.params.id)));
  },

  async create(req: Request<{}, {}, ProvinceInput>, res: Response): Promise<void> {
    res.status(201).json(await provinceService.create(req.body));
  },

  async update(req: Request<{id: string}, {}, Partial<ProvinceInput>>, res: Response): Promise<void> {
    res.json(await provinceService.update(parseId(req.params.id), req.body));
  },

  async remove(req: Request<{id: string}>, res: Response): Promise<void> {
    await provinceService.remove(parseId(req.params.id));
    res.status(204).send();
  }
};
