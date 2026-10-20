import {Amenity, AmenityQuota} from '../entities';
import {BaseRepository, WriteOptions} from './base.repository';

const withAmenity = [{model: Amenity, as: 'amenity'}];

class AmenityQuotaRepository extends BaseRepository<AmenityQuota> {
  constructor() {
    super(AmenityQuota);
  }

  findAllWithAmenity(amenityId?: number): Promise<AmenityQuota[]> {
    return this.findAll({
      where: amenityId !== undefined ? {amenityId} : undefined,
      include: withAmenity
    });
  }

  findByIdWithAmenity(id: number): Promise<AmenityQuota | null> {
    return this.findById(id, {include: withAmenity});
  }

  // Row lock (SELECT ... FOR UPDATE) so two concurrent bookings cannot both
  // consume the last units. Must be called inside a transaction.
  findByIdForUpdate(id: number, {transaction}: Required<WriteOptions>): Promise<AmenityQuota | null> {
    return this.findById(id, {transaction, lock: transaction.LOCK.UPDATE});
  }
}

export const amenityQuotaRepository = new AmenityQuotaRepository();
