import {Transaction} from 'sequelize';
import {Reservation, ReservationAmenity} from '../entities';
import {amenityQuotaRepository} from '../repositories/amenity-quota.repository';
import {reservationAmenityRepository, ReservationAmenitySearch} from '../repositories/reservation-amenity.repository';
import {reservationRepository} from '../repositories/reservation.repository';
import {runInTransaction} from '../repositories/transaction';
import {calculateNights} from '../shared/dates';
import {BadRequestError, NotFoundError} from '../shared/errors';
import {amenityPriceService} from './amenity-price.service';
import {guestService} from './guest.service';

export interface StaffConsumptionInput {
  reservationId: number;
  quotaId: number;
  quantity: number;
  unitPrice: number;
}

export interface GuestConsumptionInput {
  reservationId: number;
  quotaId: number;
  quantity: number;
}

export interface ConsumptionUpdate {
  quantity?: number;
  unitPrice?: number;
}

const NOT_FOUND = 'Consumo de servicio no encontrado';
const QUOTA_NOT_FOUND = 'Cupo no encontrado';
const RESERVATION_NOT_FOUND = 'Reserva no encontrada';

// Los servicios se cobran por día de estadía: `quantity` son las unidades que se usan
// cada día, y quedan tomadas del cupo durante toda la reserva.
const nightsOf = (reservation: Reservation): number => calculateNights(reservation.startDate, reservation.endDate);
const totalFor = (quantity: number, unitPrice: number, nights: number): number => Math.round(quantity * unitPrice * nights * 100) / 100;

// Servicios consumidos durante una reserva, cobrados por noche. Toda escritura mantiene sincronizado el
// contador `available` del cupo dentro de la misma transacción.
class ReservationAmenityService {
  constructor(
    private readonly consumptions = reservationAmenityRepository,
    private readonly quotas = amenityQuotaRepository,
    private readonly reservations = reservationRepository
  ) {}

  list(filters: ReservationAmenitySearch): Promise<ReservationAmenity[]> {
    return this.consumptions.search(filters);
  }

  async getById(id: number): Promise<ReservationAmenity> {
    const consumption = await this.consumptions.findByIdWithQuota(id);
    if (!consumption) throw new NotFoundError(NOT_FOUND);
    return consumption;
  }

  // Alta por el staff: el precio unitario viene en el request (p. ej. un precio negociado).
  createAsStaff(input: StaffConsumptionInput): Promise<ReservationAmenity> {
    return runInTransaction(async (transaction) => {
      const reservation = await this.reservations.findById(input.reservationId, {transaction});
      if (!reservation) throw new NotFoundError(RESERVATION_NOT_FOUND);
      return this.register(reservation, input.quotaId, input.quantity, input.unitPrice, transaction);
    });
  }

  createForGuest(userId: number, input: GuestConsumptionInput): Promise<ReservationAmenity> {
    return runInTransaction(async (transaction) => {
      const guestId = await guestService.requireGuestIdOfUser(userId, transaction);

      const reservation = await this.reservations.findById(input.reservationId, {transaction});
      if (!reservation || reservation.guestId !== guestId) throw new NotFoundError(RESERVATION_NOT_FOUND);

      const quota = await this.quotas.findById(input.quotaId, {transaction});
      if (!quota) throw new NotFoundError(QUOTA_NOT_FOUND);

      const currentPrice = await amenityPriceService.findCurrentPrice(quota.amenityId);
      if (!currentPrice) throw new BadRequestError('El servicio no tiene un precio vigente configurado');

      return this.register(reservation, input.quotaId, input.quantity, currentPrice.price, transaction);
    });
  }

  update(id: number, input: ConsumptionUpdate): Promise<ReservationAmenity> {
    return runInTransaction(async (transaction) => {
      const consumption = await this.consumptions.findById(id, {transaction});
      if (!consumption) throw new NotFoundError(NOT_FOUND);

      const quantity = input.quantity ?? consumption.quantity;
      const unitPrice = input.unitPrice ?? consumption.unitPrice;

      if (input.quantity !== undefined) {
        const quota = await this.quotas.findByIdForUpdate(consumption.quotaId, {transaction});
        if (!quota) throw new NotFoundError(QUOTA_NOT_FOUND);

        const available = quota.available + (consumption.quantity - quantity);
        if (available < 0 || available > quota.quantity) {
          throw new BadRequestError('Cupo insuficiente', 'No hay suficiente disponibilidad para la nueva cantidad solicitada.');
        }
        await this.quotas.update(quota, {available}, {transaction});
      }

      const reservation = await this.reservations.findById(consumption.reservationId, {transaction});
      if (!reservation) throw new NotFoundError(RESERVATION_NOT_FOUND);

      return this.consumptions.update(
        consumption,
        {quantity, unitPrice, totalAmount: totalFor(quantity, Number(unitPrice), nightsOf(reservation))},
        {transaction}
      );
    });
  }

  remove(id: number): Promise<void> {
    return runInTransaction(async (transaction) => {
      const consumption = await this.consumptions.findById(id, {transaction});
      if (!consumption) throw new NotFoundError(NOT_FOUND);

      const quota = await this.quotas.findByIdForUpdate(consumption.quotaId, {transaction});
      if (quota) {
        await this.quotas.update(quota, {available: quota.available + consumption.quantity}, {transaction});
      }
      await this.consumptions.delete(consumption, {transaction});
    });
  }

  // Borra los consumos de una reserva que se elimina. Las unidades vuelven al cupo sólo si
  // el servicio no llegó a usarse (reserva pendiente o cancelada): los de una estadía ya
  // cerrada se consumieron de verdad.
  async removeAllOfReservation(reservationId: number, returnUnits: boolean, transaction: Transaction): Promise<void> {
    for (const consumption of await this.consumptions.findByReservation(reservationId, transaction)) {
      if (returnUnits) {
        const quota = await this.quotas.findByIdForUpdate(consumption.quotaId, {transaction});
        if (quota) await this.quotas.update(quota, {available: quota.available + consumption.quantity}, {transaction});
      }
      await this.consumptions.delete(consumption, {transaction});
    }
  }

  // Recalcula los totales de los consumos cuando la reserva cambia de fechas.
  async repriceForStay(reservationId: number, nights: number, transaction: Transaction): Promise<void> {
    for (const consumption of await this.consumptions.findByReservation(reservationId, transaction)) {
      const totalAmount = totalFor(consumption.quantity, Number(consumption.unitPrice), nights);
      await this.consumptions.update(consumption, {totalAmount}, {transaction});
    }
  }

  private async register(
    reservation: Reservation,
    quotaId: number,
    quantity: number,
    unitPrice: number,
    transaction: Transaction
  ): Promise<ReservationAmenity> {
    const quota = await this.quotas.findByIdForUpdate(quotaId, {transaction});
    if (!quota) throw new NotFoundError(QUOTA_NOT_FOUND);
    if (quota.available < quantity) {
      throw new BadRequestError('Cupo insuficiente', 'No hay suficiente disponibilidad para la cantidad solicitada.');
    }

    const consumption = await this.consumptions.create(
      {
        reservationId: reservation.id,
        quotaId,
        quantity,
        unitPrice,
        totalAmount: totalFor(quantity, unitPrice, nightsOf(reservation))
      },
      {transaction}
    );
    await this.quotas.update(quota, {available: quota.available - quantity}, {transaction});
    return consumption;
  }
}

export const reservationAmenityService = new ReservationAmenityService();
