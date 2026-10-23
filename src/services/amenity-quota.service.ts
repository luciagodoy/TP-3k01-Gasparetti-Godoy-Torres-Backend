import {AmenityQuota} from '../entities';
import {amenityQuotaRepository} from '../repositories/amenity-quota.repository';
import {BadRequestError, NotFoundError} from '../shared/errors';
import {BaseService} from './base.service';

export interface AmenityQuotaInput {
  quantity: number;
  amenityId: number;
}

class AmenityQuotaService extends BaseService<AmenityQuota> {
  protected readonly notFoundMessage = 'Cupo no encontrado';
  protected readonly deleteBlockedMessage = 'Es posible que existan consumos de reserva asociados a este cupo.';

  constructor(private readonly quotas = amenityQuotaRepository) {
    super(quotas);
  }

  list(amenityId?: number): Promise<AmenityQuota[]> {
    return this.quotas.findAllWithAmenity(amenityId);
  }

  async getWithAmenity(id: number): Promise<AmenityQuota> {
    const quota = await this.quotas.findByIdWithAmenity(id);
    if (!quota) throw new NotFoundError(this.notFoundMessage);
    return quota;
  }

  create(input: AmenityQuotaInput): Promise<AmenityQuota> {
    return this.quotas.create({quantity: input.quantity, available: input.quantity, amenityId: input.amenityId});
  }

  // Cambiar el total desplaza `available` en la misma cantidad, así las unidades ya
  // consumidas siguen consumidas. No puede bajar de lo que ya se consumió.
  async update(id: number, input: Partial<AmenityQuotaInput>): Promise<AmenityQuota> {
    const quota = await this.getById(id);
    const changes: Partial<AmenityQuota> = {};

    if (input.quantity !== undefined) {
      const available = quota.available + (input.quantity - quota.quantity);
      if (available < 0 || available > input.quantity) {
        throw new BadRequestError('Cantidad inválida', 'No se puede reducir la cantidad por debajo de lo ya consumido.');
      }
      changes.quantity = input.quantity;
      changes.available = available;
    }
    if (input.amenityId !== undefined) changes.amenityId = input.amenityId;

    return this.quotas.update(quota, changes);
  }
}

export const amenityQuotaService = new AmenityQuotaService();
