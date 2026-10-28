import {Transaction} from 'sequelize';
import {Reservation, ReservationStatus, Room, RoomStatus} from '../entities';
import {reservationRepository, ReservationSearch} from '../repositories/reservation.repository';
import {roomRepository} from '../repositories/room.repository';
import {runInTransaction} from '../repositories/transaction';
import {BadRequestError, ConflictError, NotFoundError} from '../shared/errors';
import {assertValidRange, displayDate, hotelNow} from '../shared/dates';
import {BaseService} from './base.service';
import {guestService} from './guest.service';
import {pricingService} from './pricing.service';
import {reservationAmenityService} from './reservation-amenity.service';

// Horarios del hotel, en la hora de Argentina.
export const CHECK_IN_FROM = '15:00';
export const CHECK_OUT_UNTIL = '10:00';

// Fuera de horario, el staff puede confirmar un check-in anticipado o un check-out tardío.
export interface CheckInOptions {
  early?: boolean;
}

export interface CheckOutOptions {
  late?: boolean;
}

export interface StaffReservationInput {
  startDate: string;
  endDate: string;
  guestId: number;
  roomId: number;
  totalAmount?: number;
}

export interface GuestReservationInput {
  roomId: number;
  startDate: string;
  endDate: string;
  // El total que se le mostró al huésped. Con tarifa dinámica puede cambiar entre
  // la búsqueda y la confirmación; si cambió, la reserva no se hace.
  expectedTotal?: number;
}

const sameAmount = (a: number, b: number): boolean => Math.round(a * 100) === Math.round(b * 100);

export interface ReservationUpdate {
  startDate?: string;
  endDate?: string;
  roomId?: number;
  totalAmount?: number;
  status?: ReservationStatus;
}

const NOT_FOUND = 'Reserva no encontrada';

const invalidTransition = (detail: string) => new BadRequestError('Transición inválida', detail);
class ReservationService extends BaseService<Reservation> {
  protected readonly notFoundMessage = NOT_FOUND;
  protected readonly deleteBlockedMessage = 'Es posible que existan consumos asociados a esta reserva.';

  constructor(
    private readonly reservations = reservationRepository,
    private readonly rooms = roomRepository
  ) {
    super(reservations);
  }

  // --- Staff ---

  list(filters: ReservationSearch): Promise<Reservation[]> {
    return this.reservations.search(filters);
  }

  async getWithDetails(id: number): Promise<Reservation> {
    const reservation = await this.reservations.findByIdWithDetails(id);
    if (!reservation) throw new NotFoundError(NOT_FOUND);
    return reservation;
  }

  create(input: StaffReservationInput): Promise<Reservation> {
    if (!input.startDate || !input.endDate || !input.guestId || !input.roomId) {
      throw new BadRequestError('Datos incompletos', 'startDate, endDate, guestId y roomId son obligatorios.');
    }
    assertValidRange(input.startDate, input.endDate);

    return runInTransaction(async (transaction) => {
      const room = await this.assertRoomIsFree(input.roomId, input.startDate, input.endDate, undefined, transaction);
      const totalAmount =
        input.totalAmount ?? (await pricingService.quoteCategory(room.categoryId, input.startDate, input.endDate, transaction)).total;
      return this.reservations.create(
        {
          startDate: input.startDate,
          endDate: input.endDate,
          guestId: input.guestId,
          roomId: input.roomId,
          totalAmount,
          status: ReservationStatus.PENDING
        },
        {transaction}
      );
    });
  }

  update(id: number, input: ReservationUpdate): Promise<Reservation> {
    return runInTransaction(async (transaction) => {
      const reservation = await this.reservations.findById(id, {transaction});
      if (!reservation) throw new NotFoundError(NOT_FOUND);

      // El check-in y el check-out tienen sus propios endpoints, que además ocupan o
      // liberan la habitación. El único cambio de estado permitido acá es cancelar una
      // reserva pendiente (el staff no tiene otra forma de hacerlo).
      const {status} = input;
      const isCancellation = status === ReservationStatus.CANCELLED && reservation.status === ReservationStatus.PENDING;
      if (status !== undefined && status !== reservation.status && !isCancellation) {
        throw invalidTransition(
          'Con PUT sólo se puede cancelar una reserva pendiente. Para check-in y check-out usá ' +
            'POST /reservations/:id/check-in y POST /reservations/:id/check-out.'
        );
      }

      const startDate = input.startDate ?? reservation.startDate;
      const endDate = input.endDate ?? reservation.endDate;
      const roomId = input.roomId ?? reservation.roomId;
      if (input.startDate !== undefined || input.endDate !== undefined || input.roomId !== undefined) {
        await this.assertRoomIsFree(roomId, startDate, endDate, reservation.id, transaction);
      }
      // Los servicios se cobran por noche: si cambia la estadía, cambian sus totales.
      if (startDate !== reservation.startDate || endDate !== reservation.endDate) {
        await reservationAmenityService.repriceForStay(reservation.id, assertValidRange(startDate, endDate), transaction);
      }

      return this.reservations.update(
        reservation,
        {
          startDate,
          endDate,
          roomId,
          ...(input.totalAmount !== undefined && {totalAmount: input.totalAmount}),
          ...(status !== undefined && {status})
        },
        {transaction}
      );
    });
  }

  checkIn(id: number, {early = false}: CheckInOptions = {}): Promise<Reservation> {
    return runInTransaction(async (transaction) => {
      const reservation = await this.findForTransition(id, transaction);
      if (reservation.status !== ReservationStatus.PENDING) {
        throw invalidTransition(`No se puede hacer check-in de una reserva en estado "${reservation.status}".`);
      }
      this.assertCheckInTime(reservation, early);
      // Una estadía puede empezar el día en que termina la anterior; si ese huésped todavía no
      // hizo el check-out, dejar entrar a este dejaría la habitación marcada como
      // disponible cuando se produzca el check-out tardío.
      const current = await this.reservations.findCheckedInForRoom(reservation.roomId, reservation.id, transaction);
      if (current) {
        throw new BadRequestError('Habitación ocupada', `La reserva #${current.id} todavía no hizo el check-out de esta habitación.`);
      }
      await this.setRoomStatus(reservation.roomId, RoomStatus.OCCUPIED, transaction);
      return this.reservations.update(reservation, {status: ReservationStatus.CHECKED_IN}, {transaction});
    });
  }

  // Salir antes de la fecha de fin siempre se puede; pasadas las 10:00 del día de salida
  // hay que confirmarlo. Bloquearlo del todo dejaría la habitación trabada como ocupada.
  async checkOut(id: number, {late = false}: CheckOutOptions = {}): Promise<Reservation> {
    await runInTransaction(async (transaction) => {
      const reservation = await this.findForTransition(id, transaction);
      if (reservation.status !== ReservationStatus.CHECKED_IN) {
        throw invalidTransition(`No se puede hacer check-out de una reserva en estado "${reservation.status}".`);
      }
      const {date, time} = hotelNow();
      const isLate = date > reservation.endDate || (date === reservation.endDate && time > CHECK_OUT_UNTIL);
      if (isLate && !late) {
        throw new ConflictError(
          'Check-out tardío',
          `El check-out era hasta las ${CHECK_OUT_UNTIL} del ${displayDate(reservation.endDate)}. Confirmá para registrarlo igual.`,
          'LATE_CHECK_OUT'
        );
      }
      await this.setRoomStatus(reservation.roomId, RoomStatus.AVAILABLE, transaction);
      await this.reservations.update(reservation, {status: ReservationStatus.CHECKED_OUT}, {transaction});
    });
    return this.getForReceipt(id);
  }

  // Una estadía en curso no se borra: la habitación quedaría ocupada sin reserva a la que
  // hacerle el check-out.
  async remove(id: number): Promise<void> {
    await runInTransaction(async (transaction) => {
      const reservation = await this.findForTransition(id, transaction);
      if (reservation.status === ReservationStatus.CHECKED_IN) {
        throw new ConflictError('La estadía está en curso', 'Hacé el check-out antes de eliminar la reserva.');
      }
      const unitsUnused = reservation.status !== ReservationStatus.CHECKED_OUT;
      await reservationAmenityService.removeAllOfReservation(reservation.id, unitsUnused, transaction);
      await this.reservations.delete(reservation, {transaction});
    });
  }

  async getReceipt(id: number): Promise<Reservation> {
    const reservation = await this.getForReceipt(id);
    if (reservation.status !== ReservationStatus.CHECKED_OUT) {
      throw new BadRequestError('La reserva aún no registra un check-out.');
    }
    return reservation;
  }

  // --- Autoservicio del huésped ---

  createForGuest(userId: number, input: GuestReservationInput): Promise<Reservation> {
    return runInTransaction(async (transaction) => {
      const guestId = await guestService.requireGuestIdOfUser(userId, transaction);

      if (!input.roomId || !input.startDate || !input.endDate) {
        throw new BadRequestError('Datos incompletos', 'roomId, startDate y endDate son obligatorios.');
      }
      assertValidRange(input.startDate, input.endDate);

      const room = await this.assertRoomIsFree(input.roomId, input.startDate, input.endDate, undefined, transaction);

      // El huésped nunca envía el monto: se cotiza acá, dentro de la
      // transacción. El bloqueo es por habitación, así que dos huéspedes reservando habitaciones
      // *distintas* de la misma categoría en el mismo instante pueden recibir ambos el escalón
      // inferior (cada cotización no ve la otra reserva).
      const quote = await pricingService.quoteCategory(room.categoryId, input.startDate, input.endDate, transaction);
      if (input.expectedTotal != null && !sameAmount(input.expectedTotal, quote.total)) {
        throw new ConflictError(
          'El precio cambió',
          `El total para esas fechas ahora es $${quote.total.toFixed(2)}. Revisalo y confirmá de nuevo.`
        );
      }

      return this.reservations.create(
        {
          startDate: input.startDate,
          endDate: input.endDate,
          guestId,
          roomId: input.roomId,
          totalAmount: quote.total,
          status: ReservationStatus.PENDING
        },
        {transaction}
      );
    });
  }

  async listForGuest(userId: number): Promise<Reservation[]> {
    const guestId = await guestService.requireGuestIdOfUser(userId);
    return this.reservations.findByGuestWithDetails(guestId);
  }

  cancelForGuest(userId: number, id: number): Promise<Reservation> {
    return runInTransaction(async (transaction) => {
      const guestId = await guestService.requireGuestIdOfUser(userId, transaction);
      const reservation = await this.reservations.findById(id, {transaction});
      if (!reservation || reservation.guestId !== guestId) throw new NotFoundError(NOT_FOUND);
      if (reservation.status !== ReservationStatus.PENDING) {
        throw invalidTransition(`No se puede cancelar una reserva en estado "${reservation.status}".`);
      }
      return this.reservations.update(reservation, {status: ReservationStatus.CANCELLED}, {transaction});
    });
  }

  // --- Auxiliares ---

  private async assertRoomIsFree(
    roomId: number,
    startDate: string,
    endDate: string,
    excludeId: number | undefined,
    transaction: Transaction
  ): Promise<Room> {
    const room = await this.rooms.findByIdForUpdate(roomId, {transaction});
    if (!room) throw new NotFoundError('Habitación no encontrada');

    const overlap = await this.reservations.findOverlapping(roomId, startDate, endDate, excludeId, transaction);
    if (overlap) {
      throw new BadRequestError('Habitación no disponible', 'La habitación ya se encuentra reservada para las fechas seleccionadas.');
    }
    return room;
  }

  // El check-in es desde las 15:00 del día de inicio (antes de hora, confirmándolo) y hasta
  // la víspera de la salida: el día de salida la estadía ya terminó.
  private assertCheckInTime(reservation: Reservation, early: boolean): void {
    const {date, time} = hotelNow();
    if (date < reservation.startDate) {
      throw new BadRequestError(
        'Todavía no es el día del check-in',
        `La estadía empieza el ${displayDate(reservation.startDate)}; el check-in es desde las ${CHECK_IN_FROM} de ese día.`
      );
    }
    if (date >= reservation.endDate) {
      throw new BadRequestError(
        'La estadía ya terminó',
        `La salida era el ${displayDate(reservation.endDate)}. Cancelá la reserva o cambiá sus fechas.`
      );
    }
    if (date === reservation.startDate && time < CHECK_IN_FROM && !early) {
      throw new ConflictError(
        'Check-in anticipado',
        `El check-in es desde las ${CHECK_IN_FROM}. Confirmá para registrarlo antes de hora.`,
        'EARLY_CHECK_IN'
      );
    }
  }

  private async findForTransition(id: number, transaction: Transaction): Promise<Reservation> {
    const reservation = await this.reservations.findById(id, {transaction});
    if (!reservation) throw new NotFoundError(NOT_FOUND);
    return reservation;
  }

  private async setRoomStatus(roomId: number, status: RoomStatus, transaction: Transaction): Promise<void> {
    const room = await this.rooms.findById(roomId, {transaction});
    if (!room) throw new NotFoundError('Habitación no encontrada');
    await this.rooms.update(room, {status}, {transaction});
  }

  private async getForReceipt(id: number): Promise<Reservation> {
    const reservation = await this.reservations.findByIdForReceipt(id);
    if (!reservation) throw new NotFoundError(NOT_FOUND);
    return reservation;
  }
}

export const reservationService = new ReservationService();
