import {Amenity} from '../entities';
import {amenityRepository} from '../repositories/amenity.repository';
import {pickDefined} from '../shared/http';
import {BaseService} from './base.service';

export interface AmenityInput {
  name: string;
  description?: string | null;
}

class AmenityService extends BaseService<Amenity> {
  protected readonly notFoundMessage = 'Servicio no encontrado';
  protected readonly deleteBlockedMessage = 'Es posible que existan cupos o precios asociados a este servicio.';

  list(): Promise<Amenity[]> {
    return this.repository.findAll();
  }

  create(input: AmenityInput): Promise<Amenity> {
    return this.repository.create({name: input.name, description: input.description ?? null});
  }

  async update(id: number, input: Partial<AmenityInput>): Promise<Amenity> {
    const amenity = await this.getById(id);
    return this.repository.update(amenity, pickDefined(input, ['name', 'description']));
  }
}

export const amenityService = new AmenityService(amenityRepository);
