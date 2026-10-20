import {Request, Response} from 'express';
import {userService, UserInput} from '../services/user.service';
import {parseId} from '../shared/http';

// Every response goes through toSafeJSON so the password hash never leaves the API.
export const userController = {
  async list(_req: Request, res: Response): Promise<void> {
    const users = await userService.list();
    res.json(users.map((user) => user.toSafeJSON()));
  },

  async getById(req: Request<{id: string}>, res: Response): Promise<void> {
    const user = await userService.getById(parseId(req.params.id));
    res.json(user.toSafeJSON());
  },

  async create(req: Request<{}, {}, UserInput>, res: Response): Promise<void> {
    const user = await userService.create(req.body);
    res.status(201).json(user.toSafeJSON());
  },

  async update(req: Request<{id: string}, {}, Partial<UserInput>>, res: Response): Promise<void> {
    const user = await userService.update(parseId(req.params.id), req.body);
    res.json(user.toSafeJSON());
  },

  async remove(req: Request<{id: string}>, res: Response): Promise<void> {
    await userService.remove(parseId(req.params.id));
    res.status(204).send();
  }
};
