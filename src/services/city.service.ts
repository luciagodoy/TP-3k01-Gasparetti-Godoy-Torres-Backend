import {City} from '../entities';
import {cityRepository} from '../repositories/city.repository';
import {NotFoundError} from '../shared/errors';
import {pickDefined} from '../shared/http';
import {BaseService} from './base.service';

export interface CityInput {
  name: string;
  provinceId: number;
}

class CityService extends BaseService<City> {
  protected readonly notFoundMessage = 'Ciudad no encontrada';
  protected readonly deleteBlockedMessage = 'Es posible que existan huéspedes asociados a esta ciudad.';

  constructor(private readonly cities = cityRepository) {
    super(cities);
  }

  // La lista completa son ~3900 filas, así que el frontend pide una provincia por vez.
  list(provinceId?: number): Promise<City[]> {
    return this.cities.findAllWithProvince(provinceId);
  }

  async getWithProvince(id: number): Promise<City> {
    const city = await this.cities.findByIdWithProvince(id);
    if (!city) throw new NotFoundError(this.notFoundMessage);
    return city;
  }

  create(input: CityInput): Promise<City> {
    return this.cities.create({name: input.name, provinceId: input.provinceId});
  }

  async update(id: number, input: Partial<CityInput>): Promise<City> {
    const city = await this.getById(id);
    return this.cities.update(city, pickDefined(input, ['name', 'provinceId']));
  }
}

export const cityService = new CityService();
