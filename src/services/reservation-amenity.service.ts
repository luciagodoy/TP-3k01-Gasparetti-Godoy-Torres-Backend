import {Transaction} from 'sequelize';
import {ReservationAmenity} from '../entities';
import {amenityQuotaRepository} from '../repositories/amenity-quota.repository';
import {reservationAmenityRepository, ReservationAmenitySearch} from '../repositories/reservation-amenity.repository';
import {reservationRepository} from '../repositories/reservation.repository';
import {runInTransaction} from '../repositories/transaction';
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

// Amenities consumed during a reservation. Every write keeps the quota's
// `available` counter in sync inside the same transaction.
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

  // Staff entry: the unit price comes from the request (e.g. a negotiated price).
  createAsStaff(input: StaffConsumptionInput): Promise<ReservationAmenity> {
    return runInTransaction((transaction) =>
      this.register(input.reservationId, input.quotaId, input.quantity, input.unitPrice, transaction)
    );
  }

  // Self-service: the guest only picks quota and quantity. The price is ALWAYS
  // resolved on the server (never trusted from the client) and the reservation
  // must belong to the guest.
  createForGuest(userId: number, input: GuestConsumptionInput): Promise<ReservationAmenity> {
    return runInTransaction(async (transaction) => {
      const guestId = await guestService.requireGuestIdOfUser(userId, transaction);

      const reservation = await this.reservations.findById(input.reservationId, {transaction});
      if (!reservation || reservation.guestId !== guestId) throw new NotFoundError('Reserva no encontrada');

      const quota = await this.quotas.findById(input.quotaId, {transaction});
      if (!quota) throw new NotFoundError(QUOTA_NOT_FOUND);

      const currentPrice = await amenityPriceService.findCurrentPrice(quota.amenityId);
      if (!currentPrice) throw new BadRequestError('El servicio no tiene un precio vigente configurado');

      return this.register(input.reservationId, input.quotaId, input.quantity, currentPrice.price, transaction);
    });
  }

  // Changing the quantity gives units back to (or takes them from) the quota.
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
          throw new BadRequestError(
            'Cupo insuficiente',
            'No hay suficiente disponibilidad para la nueva cantidad solicitada.'
          );
        }
        await this.quotas.update(quota, {available}, {transaction});
      }

      return this.consumptions.update(
        consumption,
        {quantity, unitPrice, totalAmount: quantity * unitPrice},
        {transaction}
      );
    });
  }

  // Deleting a consumption returns its units to the quota.
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

  private async register(
    reservationId: number,
    quotaId: number,
    quantity: number,
    unitPrice: number,
    transaction: Transaction
  ): Promise<ReservationAmenity> {
    // Locking the quota row prevents two concurrent bookings from both taking
    // the last units (a transaction alone is not enough).
    const quota = await this.quotas.findByIdForUpdate(quotaId, {transaction});
    if (!quota) throw new NotFoundError(QUOTA_NOT_FOUND);
    if (quota.available < quantity) {
      throw new BadRequestError('Cupo insuficiente', 'No hay suficiente disponibilidad para la cantidad solicitada.');
    }

    const consumption = await this.consumptions.create(
      {reservationId, quotaId, quantity, unitPrice, totalAmount: quantity * unitPrice},
      {transaction}
    );
    await this.quotas.update(quota, {available: quota.available - quantity}, {transaction});
    return consumption;
  }
}

export const reservationAmenityService = new ReservationAmenityService();
