import {Province} from '../entities';
import {provinceRepository} from '../repositories/province.repository';
import {pickDefined} from '../shared/http';
import {BaseService} from './base.service';

export interface ProvinceInput {
  name: string;
}

class ProvinceService extends BaseService<Province> {
  protected readonly notFoundMessage = 'Provincia no encontrada';
  protected readonly deleteBlockedMessage = 'Es posible que existan ciudades asociadas a esta provincia.';

  list(): Promise<Province[]> {
    return this.repository.findAll();
  }

  create(input: ProvinceInput): Promise<Province> {
    return this.repository.create({name: input.name});
  }

  async update(id: number, input: Partial<ProvinceInput>): Promise<Province> {
    const province = await this.getById(id);
    return this.repository.update(province, pickDefined(input, ['name']));
  }
}

export const provinceService = new ProvinceService(provinceRepository);
