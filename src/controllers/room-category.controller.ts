import {Request, Response} from 'express';
import {roomCategoryService, RoomCategoryInput} from '../services/room-category.service';
import {parseId} from '../shared/http';

export const roomCategoryController = {
  async list(_req: Request, res: Response): Promise<void> {
    res.json(await roomCategoryService.list());
  },

  async getById(req: Request<{id: string}>, res: Response): Promise<void> {
    res.json(await roomCategoryService.getById(parseId(req.params.id)));
  },

  async create(req: Request<{}, {}, RoomCategoryInput>, res: Response): Promise<void> {
    res.status(201).json(await roomCategoryService.create(req.body));
  },

  async update(req: Request<{id: string}, {}, Partial<RoomCategoryInput>>, res: Response): Promise<void> {
    res.json(await roomCategoryService.update(parseId(req.params.id), req.body));
  },

  async remove(req: Request<{id: string}>, res: Response): Promise<void> {
    await roomCategoryService.remove(parseId(req.params.id));
    res.status(204).send();
  }
};
