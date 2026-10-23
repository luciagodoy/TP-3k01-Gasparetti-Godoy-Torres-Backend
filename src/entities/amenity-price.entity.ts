import {Model, DataTypes, Optional} from 'sequelize';
import {sequelize} from '../config/database';
import type Amenity from './amenity.entity';

// Precio de un servicio durante un período de vigencia (validTo null = sigue vigente).
interface AmenityPriceAttributes {
  id: number;
  price: number;
  validFrom: string; // DATEONLY: 'YYYY-MM-DD'
  validTo: string | null;
  amenityId: number;
}

interface AmenityPriceCreationAttributes extends Optional<AmenityPriceAttributes, 'id' | 'validTo'> {}

class AmenityPrice
  extends Model<AmenityPriceAttributes, AmenityPriceCreationAttributes>
  implements AmenityPriceAttributes
{
  declare id: number;
  declare price: number;
  declare validFrom: string;
  declare validTo: string | null;
  declare amenityId: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare amenity?: Amenity;
}

AmenityPrice.init(
  {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'precio',
      get() {
        const value = this.getDataValue('price');
        return value ? parseFloat(value as unknown as string) : 0;
      }
    },
    validFrom: {type: DataTypes.DATEONLY, allowNull: false, field: 'fechaVigenciaDesde'},
    validTo: {type: DataTypes.DATEONLY, allowNull: true, field: 'fechaVigenciaHasta'},
    amenityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'servicioId',
      references: {model: 'Servicios', key: 'id'}
    }
  },
  {sequelize, tableName: 'PreciosServicio', timestamps: true}
);

export default AmenityPrice;
