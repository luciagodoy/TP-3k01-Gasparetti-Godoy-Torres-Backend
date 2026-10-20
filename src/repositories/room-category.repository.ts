import {RoomCategory} from '../entities';
import {BaseRepository} from './base.repository';

class RoomCategoryRepository extends BaseRepository<RoomCategory> {
  constructor() {
    super(RoomCategory);
  }
}

export const roomCategoryRepository = new RoomCategoryRepository();
