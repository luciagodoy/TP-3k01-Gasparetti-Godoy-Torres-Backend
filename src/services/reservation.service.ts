import {Transaction} from 'sequelize';
import {Reservation, ReservationStatus, Room, RoomStatus} from '../entities';
import {reservationRepository, ReservationSearch} from '../repositories/reservation.repository';
import {roomRepository} from '../repositories/room.repository';
import {runInTransaction} from '../repositories/transaction';
import {BadRequestError, ConflictError, NotFoundError} from '../shared/errors';
import {assertValidRange} from '../shared/dates';
import {BaseService} from './base.service';
import {guestService} from './guest.service';
import {pricingService} from './pricing.service';

export interface StaffReservationInput {
  startDate: string;
  endDate: string;
  guestId: number;
  roomId: number;
  // Optional: staff may agree on a price; without one the dynamic rate applies.
  totalAmount?: number;
}

export interface GuestReservationInput {
  roomId: number;
  startDate: string;
  endDate: string;
  // The total the guest was shown. With dynamic pricing it can change between
  // the search and the confirmation; if it did, the booking is not made.
  expectedTotal?: number;
}

// Amounts are compared in cents: 0.1 + 0.2 !== 0.3 in floating point.
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

// Life cycle: pendiente -> check-in -> check-out, or pendiente -> cancelada.
// Each transition has its own method; the generic update cannot skip steps.
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
    // Checked before querying: with a missing field the overlap query fails
    // with a generic error before the entity validators can run.
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

      // Check-in and check-out have their own endpoints, which also occupy or
      // free the room. The only status change allowed here is cancelling a
      // pending reservation (staff have no other way to do it).
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

  checkIn(id: number): Promise<Reservation> {
    return runInTransaction(async (transaction) => {
      const reservation = await this.findForTransition(id, transaction);
      if (reservation.status !== ReservationStatus.PENDING) {
        throw invalidTransition(`No se puede hacer check-in de una reserva en estado "${reservation.status}".`);
      }
      // A stay may start the day the previous one ends; if that guest has not
      // checked out yet, letting this one in would leave the room marked as
      // available when the late check-out happens.
      const current = await this.reservations.findCheckedInForRoom(reservation.roomId, reservation.id, transaction);
      if (current) {
        throw new BadRequestError('Habitación ocupada', `La reserva #${current.id} todavía no hizo el check-out de esta habitación.`);
      }
      await this.setRoomStatus(reservation.roomId, RoomStatus.OCCUPIED, transaction);
      return this.reservations.update(reservation, {status: ReservationStatus.CHECKED_IN}, {transaction});
    });
  }

  // Returns the reservation with everything the receipt needs.
  async checkOut(id: number): Promise<Reservation> {
    await runInTransaction(async (transaction) => {
      const reservation = await this.findForTransition(id, transaction);
      if (reservation.status !== ReservationStatus.CHECKED_IN) {
        throw invalidTransition(`No se puede hacer check-out de una reserva en estado "${reservation.status}".`);
      }
      await this.setRoomStatus(reservation.roomId, RoomStatus.AVAILABLE, transaction);
      await this.reservations.update(reservation, {status: ReservationStatus.CHECKED_OUT}, {transaction});
    });
    return this.getForReceipt(id);
  }

  async getReceipt(id: number): Promise<Reservation> {
    const reservation = await this.getForReceipt(id);
    if (reservation.status !== ReservationStatus.CHECKED_OUT) {
      throw new BadRequestError('La reserva aún no registra un check-out.');
    }
    return reservation;
  }

  // --- Guest self-service ---

  createForGuest(userId: number, input: GuestReservationInput): Promise<Reservation> {
    return runInTransaction(async (transaction) => {
      const guestId = await guestService.requireGuestIdOfUser(userId, transaction);

      if (!input.roomId || !input.startDate || !input.endDate) {
        throw new BadRequestError('Datos incompletos', 'roomId, startDate y endDate son obligatorios.');
      }
      assertValidRange(input.startDate, input.endDate);

      const room = await this.assertRoomIsFree(input.roomId, input.startDate, input.endDate, undefined, transaction);

      // The guest never sends the amount: it is quoted here, inside the
      // transaction. The lock is per room, so two guests booking *different*
      // rooms of the same category at the same instant may both get the tier
      // below (each quote misses the other booking). Availability is not at
      // risk, only one price step; serializing every booking of a category
      // would cost far more than it protects.
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
      // Someone else's reservation answers 404, not 403: it does not reveal that it exists.
      if (!reservation || reservation.guestId !== guestId) throw new NotFoundError(NOT_FOUND);
      if (reservation.status !== ReservationStatus.PENDING) {
        throw invalidTransition(`No se puede cancelar una reserva en estado "${reservation.status}".`);
      }
      return this.reservations.update(reservation, {status: ReservationStatus.CANCELLED}, {transaction});
    });
  }

  // --- Helpers ---

  private async assertRoomIsFree(
    roomId: number,
    startDate: string,
    endDate: string,
    excludeId: number | undefined,
    transaction: Transaction
  ): Promise<Room> {
    // Locking the room first makes concurrent bookings of the same room wait
    // for each other, so the check and the insert behave as one step.
    const room = await this.rooms.findByIdForUpdate(roomId, {transaction});
    if (!room) throw new NotFoundError('Habitación no encontrada');

    const overlap = await this.reservations.findOverlapping(roomId, startDate, endDate, excludeId, transaction);
    if (overlap) {
      throw new BadRequestError('Habitación no disponible', 'La habitación ya se encuentra reservada para las fechas seleccionadas.');
    }
    return room;
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
