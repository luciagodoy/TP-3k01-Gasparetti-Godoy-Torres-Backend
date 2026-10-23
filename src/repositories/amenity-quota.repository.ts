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

  // Bloqueo de fila (SELECT ... FOR UPDATE) para que dos reservas concurrentes no puedan
  // consumir ambas las últimas unidades. 
  findByIdForUpdate(id: number, {transaction}: Required<WriteOptions>): Promise<AmenityQuota | null> {
    return this.findById(id, {transaction, lock: transaction.LOCK.UPDATE});
  }
}

export const amenityQuotaRepository = new AmenityQuotaRepository();
