import {Op, Transaction, WhereOptions} from 'sequelize';
import {
  Amenity,
  AmenityQuota,
  City,
  Guest,
  Province,
  Reservation,
  ReservationAmenity,
  ReservationStatus,
  Room,
  RoomCategory,
  User
} from '../entities';
import {BaseRepository} from './base.repository';

export interface ReservationSearch {
  guestId?: number;
  roomId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

// Regla de negocio: el check-out es hasta las 10:00 del último día y el check-in desde las
// 15:00 del primer día, así que el día en que termina una estadía puede ser el día en que
// empieza la siguiente. Dos estadías se superponen sólo si cada una empieza estrictamente
// antes de que termine la otra (esto también cubre que una contenga a la otra).
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
      // Una lectura con bloqueo ve las últimas filas confirmadas. Un SELECT común
      // leería el snapshot de la transacción (REPEATABLE READ en MySQL), que puede ser
      // anterior a una reserva que otro request acaba de confirmar para esta habitación.
      ...(transaction && {lock: transaction.LOCK.UPDATE})
    });
  }

  // La estadía que está actualmente en la habitación, si hay alguna. Hace falta porque con
  // recambio el mismo día la reserva siguiente puede intentar hacer check-in antes de que esta salga.
  findCheckedInForRoom(roomId: number, excludeId: number, transaction: Transaction): Promise<Reservation | null> {
    return this.findOne({
      where: {roomId, status: ReservationStatus.CHECKED_IN, id: {[Op.ne]: excludeId}},
      transaction
    });
  }

  // Reservas activas de las categorías dadas que tocan [startDate, endDate),
  // en una sola consulta: el servicio de precios cuenta la ocupación de cada noche a partir
  // de esta lista en memoria, en vez de ejecutar una consulta por noche.
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

  // The staff detail view: the full reservation plus the guest's data (account
  // without the password, and location), the room with its category and the
  // consumed amenities.
  findByIdWithDetails(id: number): Promise<Reservation | null> {
    return this.findById(id, {
      include: [
        {
          model: Guest,
          as: 'guest',
          include: [
            {model: User, as: 'user', attributes: {exclude: ['password']}},
            {model: City, as: 'city', include: [{model: Province, as: 'province'}]}
          ]
        },
        {model: Room, as: 'room', include: [{model: RoomCategory, as: 'category'}]},
        withAmenities
      ]
    });
  }

  findByGuestWithDetails(guestId: number): Promise<Reservation[]> {
    return this.findAll({
      where: {guestId},
      include: [{model: Room, as: 'room', include: [{model: RoomCategory, as: 'category'}]}, withAmenities],
      order: [['startDate', 'DESC']]
    });
  }

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
