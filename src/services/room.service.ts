import {Room, RoomStatus} from '../entities';
import {reservationRepository} from '../repositories/reservation.repository';
import {roomRepository} from '../repositories/room.repository';
import {NotFoundError} from '../shared/errors';
import {pickDefined} from '../shared/http';
import {BaseService} from './base.service';

export interface RoomInput {
  number: number;
  floor: number;
  status?: RoomStatus;
  categoryId: number;
}

export interface RoomFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: number;
  people?: number;
}

const EDITABLE_FIELDS = ['number', 'floor', 'status', 'categoryId'] as const;

class RoomService extends BaseService<Room> {
  protected readonly notFoundMessage = 'Habitación no encontrada';
  protected readonly deleteBlockedMessage = 'Es posible que existan reservas asociadas a esta habitación.';

  constructor(
    private readonly rooms = roomRepository,
    private readonly reservations = reservationRepository
  ) {
    super(rooms);
  }

  async search({startDate, endDate, categoryId, people}: RoomFilters): Promise<Room[]> {
    const byDates = Boolean(startDate && endDate);
    const excludeIds = byDates ? await this.reservations.findBookedRoomIds(startDate!, endDate!) : [];
    return this.rooms.search({categoryId, minCapacity: people, onlyAvailable: byDates, excludeIds});
  }

  async getWithCategory(id: number): Promise<Room> {
    const room = await this.rooms.findByIdWithCategory(id);
    if (!room) throw new NotFoundError(this.notFoundMessage);
    return room;
  }

  create(input: RoomInput): Promise<Room> {
    return this.rooms.create({
      number: input.number,
      floor: input.floor,
      status: input.status || RoomStatus.AVAILABLE,
      categoryId: input.categoryId
    });
  }

  async update(id: number, input: Partial<RoomInput>): Promise<Room> {
    const room = await this.getById(id);
    return this.rooms.update(room, pickDefined(input, EDITABLE_FIELDS));
  }
}

export const roomService = new RoomService();
