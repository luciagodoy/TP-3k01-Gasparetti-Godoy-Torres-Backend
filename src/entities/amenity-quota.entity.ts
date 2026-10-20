import {Model, DataTypes, Optional} from 'sequelize';
import {sequelize} from '../config/database';
import type Amenity from './amenity.entity';

// How many units of an amenity can be booked in total, and how many are left.
interface AmenityQuotaAttributes {
  id: number;
  quantity: number;
  available: number;
  amenityId: number;
}

interface AmenityQuotaCreationAttributes extends Optional<AmenityQuotaAttributes, 'id'> {}

class AmenityQuota
  extends Model<AmenityQuotaAttributes, AmenityQuotaCreationAttributes>
  implements AmenityQuotaAttributes
{
  declare id: number;
  declare quantity: number;
  declare available: number;
  declare amenityId: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare amenity?: Amenity;
}

AmenityQuota.init(
  {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    quantity: {type: DataTypes.INTEGER, allowNull: false, validate: {min: 0}, field: 'cantidad'},
    available: {type: DataTypes.INTEGER, allowNull: false, validate: {min: 0}, field: 'disponibles'},
    amenityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'servicioId',
      references: {model: 'Servicios', key: 'id'}
    }
  },
  {sequelize, tableName: 'Cupos', timestamps: true}
);

export default AmenityQuota;
