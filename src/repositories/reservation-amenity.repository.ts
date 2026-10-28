import {Transaction} from 'sequelize';
import {Amenity, AmenityQuota, ReservationAmenity} from '../entities';
import {BaseRepository} from './base.repository';

export interface ReservationAmenitySearch {
  reservationId?: number;
  quotaId?: number;
}

const withQuota = [{model: AmenityQuota, as: 'quota', include: [{model: Amenity, as: 'amenity'}]}];

class ReservationAmenityRepository extends BaseRepository<ReservationAmenity> {
  constructor() {
    super(ReservationAmenity);
  }

  search({reservationId, quotaId}: ReservationAmenitySearch): Promise<ReservationAmenity[]> {
    return this.findAll({
      where: {
        ...(reservationId !== undefined && {reservationId}),
        ...(quotaId !== undefined && {quotaId})
      },
      include: withQuota
    });
  }

  findByIdWithQuota(id: number): Promise<ReservationAmenity | null> {
    return this.findById(id, {include: withQuota});
  }

  findByReservation(reservationId: number, transaction: Transaction): Promise<ReservationAmenity[]> {
    return this.findAll({where: {reservationId}, transaction});
  }
}

export const reservationAmenityRepository = new ReservationAmenityRepository();
