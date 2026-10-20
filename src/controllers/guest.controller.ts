import {Request, Response} from 'express';
import {guestService, GuestRegistration, GuestUpdate} from '../services/guest.service';
import {parseId} from '../shared/http';

export const guestController = {
  async register(req: Request<{}, {}, GuestRegistration>, res: Response): Promise<void> {
    await guestService.register(req.body);
    res.status(201).json({message: 'Huésped creado con éxito'});
  },

  async getMyProfile(req: Request, res: Response): Promise<void> {
    res.json(await guestService.getProfileOfUser(req.user!.id));
  },

  async list(_req: Request, res: Response): Promise<void> {
    res.json(await guestService.list());
  },

  async getById(req: Request<{id: string}>, res: Response): Promise<void> {
    res.json(await guestService.getWithProfile(parseId(req.params.id)));
  },

  async update(req: Request<{id: string}, {}, GuestUpdate>, res: Response): Promise<void> {
    res.json(await guestService.update(parseId(req.params.id), req.body));
  },

  async remove(req: Request<{id: string}>, res: Response): Promise<void> {
    await guestService.remove(parseId(req.params.id));
    res.status(204).send();
  }
};
