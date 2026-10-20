import {Province} from '../entities';
import {BaseRepository} from './base.repository';

class ProvinceRepository extends BaseRepository<Province> {
  constructor() {
    super(Province);
  }
}

export const provinceRepository = new ProvinceRepository();
