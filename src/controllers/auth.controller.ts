import {Request, Response} from 'express';
import {authService, Credentials} from '../services/auth.service';

export const authController = {
  async login(req: Request<{}, {}, Credentials>, res: Response): Promise<void> {
    res.json(await authService.login(req.body));
  }
};
