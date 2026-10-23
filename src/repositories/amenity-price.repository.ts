import {Op} from 'sequelize';
import {Amenity, AmenityPrice} from '../entities';
import {BaseRepository} from './base.repository';

const withAmenity = [{model: Amenity, as: 'amenity'}];

class AmenityPriceRepository extends BaseRepository<AmenityPrice> {
  constructor() {
    super(AmenityPrice);
  }

  findAllWithAmenity(amenityId?: number): Promise<AmenityPrice[]> {
    return this.findAll({
      where: amenityId !== undefined ? {amenityId} : undefined,
      include: withAmenity
    });
  }

  findByIdWithAmenity(id: number): Promise<AmenityPrice | null> {
    return this.findById(id, {include: withAmenity});
  }

  findValidOn(amenityId: number, date: string): Promise<AmenityPrice | null> {
    return this.findOne({
      where: {
        amenityId,
        validFrom: {[Op.lte]: date},
        [Op.or]: [{validTo: null}, {validTo: {[Op.gte]: date}}]
      },
      order: [['validFrom', 'DESC']]
    });
  }
}

export const amenityPriceRepository = new AmenityPriceRepository();
