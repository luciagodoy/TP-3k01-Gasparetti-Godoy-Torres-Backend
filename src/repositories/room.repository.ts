import {Op, Transaction, WhereOptions} from 'sequelize';
import {Room, RoomCategory, RoomStatus} from '../entities';
import {BaseRepository, WriteOptions} from './base.repository';

export interface RoomSearch {
  categoryId?: number;
  minCapacity?: number;
  onlyAvailable?: boolean;
  excludeIds?: number[];
}

class RoomRepository extends BaseRepository<Room> {
  constructor() {
    super(Room);
  }

  search({categoryId, minCapacity, onlyAvailable, excludeIds}: RoomSearch): Promise<Room[]> {
    const roomWhere: WhereOptions<Room> = {};
    if (onlyAvailable) roomWhere.status = RoomStatus.AVAILABLE;
    if (excludeIds && excludeIds.length > 0) roomWhere.id = {[Op.notIn]: excludeIds};

    const categoryWhere: WhereOptions<RoomCategory> = {};
    if (categoryId !== undefined) categoryWhere.id = categoryId;
    if (minCapacity !== undefined) categoryWhere.capacity = {[Op.gte]: minCapacity};

    return this.findAll({
      where: roomWhere,
      // required: INNER JOIN, so the category filters also filter the rooms.
      include: [{model: RoomCategory, as: 'category', where: categoryWhere, required: true}]
    });
  }

  findByIdWithCategory(id: number): Promise<Room | null> {
    return this.findById(id, {include: [{model: RoomCategory, as: 'category'}]});
  }

  // Number of rooms of each category: the denominator of the occupancy.
  async countByCategory(categoryIds: number[], transaction?: Transaction): Promise<Map<number, number>> {
    const rooms = await this.findAll({where: {categoryId: categoryIds}, attributes: ['id', 'categoryId'], transaction});
    const counts = new Map<number, number>();
    for (const room of rooms) counts.set(room.categoryId, (counts.get(room.categoryId) ?? 0) + 1);
    return counts;
  }

  // Row lock (SELECT ... FOR UPDATE): serializes the reservations of one room,
  // so two concurrent bookings cannot both pass the overlap check. Must be
  // called inside a transaction.
  findByIdForUpdate(id: number, {transaction}: Required<WriteOptions>): Promise<Room | null> {
    return this.findById(id, {transaction, lock: transaction.LOCK.UPDATE});
  }
}

export const roomRepository = new RoomRepository();
