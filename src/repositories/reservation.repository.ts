import {Op, Transaction, WhereOptions} from 'sequelize';
import {Amenity, AmenityQuota, Guest, Reservation, ReservationAmenity, ReservationStatus, Room, RoomCategory, User} from '../entities';
import {BaseRepository} from './base.repository';

export interface ReservationSearch {
  guestId?: number;
  roomId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

// Business rule: check-out is until 10:00 of the last day and check-in from
// 15:00 of the first day, so the day a stay ends can be the day the next one
// starts. Two stays overlap only if each one starts strictly before the other
// ends (this also covers one containing the other).
const overlapping = (startDate: string, endDate: string): WhereOptions<Reservation> => ({
  startDate: {[Op.lt]: endDate},
  endDate: {[Op.gt]: startDate}
});

const notCancelled = {status: {[Op.ne]: ReservationStatus.CANCELLED}};

const withAmenities = {
  model: ReservationAmenity,
  as: 'consumedAmenities',
  include: [{model: AmenityQuota, as: 'quota', include: [{model: Amenity, as: 'amenity'}]}]
};

class ReservationRepository extends BaseRepository<Reservation> {
  constructor() {
    super(Reservation);
  }

  findOverlapping(
    roomId: number,
    startDate: string,
    endDate: string,
    excludeId?: number,
    transaction?: Transaction
  ): Promise<Reservation | null> {
    return this.findOne({
      where: {
        roomId,
        ...notCancelled,
        ...(excludeId !== undefined && {id: {[Op.ne]: excludeId}}),
        ...overlapping(startDate, endDate)
      },
      transaction,
      // A locking read sees the latest committed rows. A plain SELECT would
      // read the transaction's snapshot (REPEATABLE READ in MySQL), which can
      // predate a reservation another request just committed for this room.
      ...(transaction && {lock: transaction.LOCK.UPDATE})
    });
  }

  // The stay currently in the room, if any. Needed because with same-day
  // turnover the next reservation may try to check in before this one leaves.
  findCheckedInForRoom(roomId: number, excludeId: number, transaction: Transaction): Promise<Reservation | null> {
    return this.findOne({
      where: {roomId, status: ReservationStatus.CHECKED_IN, id: {[Op.ne]: excludeId}},
      transaction
    });
  }

  // Active reservations of the given categories that touch [startDate, endDate),
  // in one query: the pricing service counts the occupancy of each night from
  // this list in memory instead of running one query per night.
  findActiveInRange(startDate: string, endDate: string, categoryIds: number[], transaction?: Transaction): Promise<Reservation[]> {
    return this.findAll({
      where: {...notCancelled, ...overlapping(startDate, endDate)},
      attributes: ['id', 'startDate', 'endDate', 'roomId'],
      include: [{model: Room, as: 'room', attributes: ['id', 'categoryId'], where: {categoryId: categoryIds}, required: true}],
      transaction
    });
  }

  async findBookedRoomIds(startDate: string, endDate: string): Promise<number[]> {
    const reservations = await this.findAll({
      where: {...notCancelled, ...overlapping(startDate, endDate)},
      attributes: ['roomId']
    });
    return reservations.map((reservation) => reservation.roomId);
  }

  search({guestId, roomId, status, startDate, endDate}: ReservationSearch): Promise<Reservation[]> {
    const where: WhereOptions<Reservation> = {
      ...(guestId !== undefined && {guestId}),
      ...(roomId !== undefined && {roomId}),
      ...(status && {status: status as ReservationStatus}),
      ...(startDate && endDate && overlapping(startDate, endDate))
    };
    return this.findAll({where, include: [{model: Room, as: 'room'}]});
  }

  findByIdWithRoom(id: number): Promise<Reservation | null> {
    return this.findById(id, {include: [{model: Room, as: 'room'}]});
  }

  findByGuestWithDetails(guestId: number): Promise<Reservation[]> {
    return this.findAll({
      where: {guestId},
      include: [{model: Room, as: 'room', include: [{model: RoomCategory, as: 'category'}]}, withAmenities],
      order: [['startDate', 'DESC']]
    });
  }

  // Everything the payment receipt needs, in one query.
  findByIdForReceipt(id: number): Promise<Reservation | null> {
    return this.findById(id, {
      include: [
        {
          model: Guest,
          as: 'guest',
          include: [{model: User, as: 'user', attributes: {exclude: ['password']}}]
        },
        {model: Room, as: 'room'},
        withAmenities
      ]
    });
  }
}

export const reservationRepository = new ReservationRepository();
