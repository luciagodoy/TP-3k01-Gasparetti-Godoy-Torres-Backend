import {Request, Response} from 'express';
import {roomService, RoomInput} from '../services/room.service';
import {optionalNumber, parseId} from '../shared/http';

interface SearchRoomsQuery {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  people?: string;
}

export const roomController = {
  async search(req: Request<{}, {}, {}, SearchRoomsQuery>, res: Response): Promise<void> {
    const {startDate, endDate, categoryId, people} = req.query;
    res.json(
      await roomService.search({
        startDate,
        endDate,
        categoryId: optionalNumber(categoryId),
        people: optionalNumber(people)
      })
    );
  },

  async getById(req: Request<{id: string}>, res: Response): Promise<void> {
    res.json(await roomService.getWithCategory(parseId(req.params.id)));
  },

  async create(req: Request<{}, {}, RoomInput>, res: Response): Promise<void> {
    res.status(201).json(await roomService.create(req.body));
  },

  async update(req: Request<{id: string}, {}, Partial<RoomInput>>, res: Response): Promise<void> {
    res.json(await roomService.update(parseId(req.params.id), req.body));
  },

  async remove(req: Request<{id: string}>, res: Response): Promise<void> {
    await roomService.remove(parseId(req.params.id));
    res.status(204).send();
  }
};
