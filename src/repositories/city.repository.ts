import {City, Province} from '../entities';
import {BaseRepository} from './base.repository';

const withProvince = [{model: Province, as: 'province'}];

class CityRepository extends BaseRepository<City> {
  constructor() {
    super(City);
  }

  findAllWithProvince(provinceId?: number): Promise<City[]> {
    return this.findAll({
      where: provinceId !== undefined ? {provinceId} : undefined,
      include: withProvince
    });
  }

  findByIdWithProvince(id: number): Promise<City | null> {
    return this.findById(id, {include: withProvince});
  }
}

export const cityRepository = new CityRepository();
