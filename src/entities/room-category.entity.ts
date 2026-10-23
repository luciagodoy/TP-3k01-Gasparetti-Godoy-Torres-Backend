import {Model, DataTypes, Optional} from 'sequelize';
import {sequelize} from '../config/database';

interface RoomCategoryAttributes {
  id: number;
  name: string;
  description: string | null;
  capacity: number;
  imageUrls: string[];
  pricePerNight: number;
}

interface RoomCategoryCreationAttributes
  extends Optional<RoomCategoryAttributes, 'id' | 'description' | 'imageUrls' | 'pricePerNight'> {}

class RoomCategory
  extends Model<RoomCategoryAttributes, RoomCategoryCreationAttributes>
  implements RoomCategoryAttributes
{
  declare id: number;
  declare name: string;
  declare description: string | null;
  declare capacity: number;
  declare imageUrls: string[];
  declare pricePerNight: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

RoomCategory.init(
  {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING, allowNull: false, unique: true, field: 'denominacion'},
    description: {type: DataTypes.TEXT, allowNull: true, field: 'descripcion'},
    capacity: {type: DataTypes.INTEGER, allowNull: false, field: 'capacidadPersonas'},
    imageUrls: {type: DataTypes.JSON, allowNull: false, defaultValue: [], field: 'imagenesUrl'},
    pricePerNight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'precioNoche',
      get() {
        const value = this.getDataValue('pricePerNight');
        return value ? parseFloat(value as unknown as string) : 0;
      }
    }
  },
  {sequelize, tableName: 'CategoriasHabitacion', timestamps: true}
);

export default RoomCategory;
