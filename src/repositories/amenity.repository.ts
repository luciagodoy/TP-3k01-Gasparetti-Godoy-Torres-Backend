import {Amenity} from '../entities';
import {BaseRepository} from './base.repository';

class AmenityRepository extends BaseRepository<Amenity> {
  constructor() {
    super(Amenity);
  }
}

export const amenityRepository = new AmenityRepository();
