import {RoomCategory} from '../entities';
import {roomCategoryRepository} from '../repositories/room-category.repository';
import {pickDefined} from '../shared/http';
import {BaseService} from './base.service';

export interface RoomCategoryInput {
  name: string;
  description?: string | null;
  capacity: number;
  imageUrls?: string[];
  pricePerNight?: number;
}

const EDITABLE_FIELDS = ['name', 'description', 'capacity', 'imageUrls', 'pricePerNight'] as const;

class RoomCategoryService extends BaseService<RoomCategory> {
  protected readonly notFoundMessage = 'Categoría no encontrada';
  protected readonly deleteBlockedMessage = 'Es posible que existan habitaciones o reglas de tarifa asociadas a esta categoría.';

  list(): Promise<RoomCategory[]> {
    return this.repository.findAll();
  }

  create(input: RoomCategoryInput): Promise<RoomCategory> {
    return this.repository.create({
      name: input.name,
      description: input.description ?? null,
      capacity: input.capacity,
      imageUrls: input.imageUrls ?? [],
      pricePerNight: input.pricePerNight ?? 0
    });
  }

  async update(id: number, input: Partial<RoomCategoryInput>): Promise<RoomCategory> {
    const category = await this.getById(id);
    return this.repository.update(category, pickDefined(input, EDITABLE_FIELDS));
  }
}

export const roomCategoryService = new RoomCategoryService(roomCategoryRepository);
