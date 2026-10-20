import {Request, Response} from 'express';
import {
  ConsumptionUpdate,
  GuestConsumptionInput,
  reservationAmenityService,
  StaffConsumptionInput
} from '../services/reservation-amenity.service';
import {optionalNumber, parseId} from '../shared/http';

export const reservationAmenityController = {
  async createMine(req: Request<{}, {}, GuestConsumptionInput>, res: Response): Promise<void> {
    res.status(201).json(await reservationAmenityService.createForGuest(req.user!.id, req.body));
  },

  async create(req: Request<{}, {}, StaffConsumptionInput>, res: Response): Promise<void> {
    res.status(201).json(await reservationAmenityService.createAsStaff(req.body));
  },

  async list(req: Request<{}, {}, {}, {reservationId?: string; quotaId?: string}>, res: Response): Promise<void> {
    res.json(
      await reservationAmenityService.list({
        reservationId: optionalNumber(req.query.reservationId),
        quotaId: optionalNumber(req.query.quotaId)
      })
    );
  },

  async getById(req: Request<{id: string}>, res: Response): Promise<void> {
    res.json(await reservationAmenityService.getById(parseId(req.params.id)));
  },

  async update(req: Request<{id: string}, {}, ConsumptionUpdate>, res: Response): Promise<void> {
    res.json(await reservationAmenityService.update(parseId(req.params.id), req.body));
  },

  async remove(req: Request<{id: string}>, res: Response): Promise<void> {
    await reservationAmenityService.remove(parseId(req.params.id));
    res.status(204).send();
  }
};
