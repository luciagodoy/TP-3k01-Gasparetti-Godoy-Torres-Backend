import {Model, DataTypes, Optional} from 'sequelize';
import {sequelize} from '../config/database';

// An extra service the hotel offers (spa, breakfast, parking...). Named
// "amenity" so it does not clash with the service layer.
interface AmenityAttributes {
  id: number;
  name: string;
  description: string | null;
}

interface AmenityCreationAttributes extends Optional<AmenityAttributes, 'id' | 'description'> {}

class Amenity extends Model<AmenityAttributes, AmenityCreationAttributes> implements AmenityAttributes {
  declare id: number;
  declare name: string;
  declare description: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Amenity.init(
  {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING, allowNull: false, unique: true, field: 'nombre'},
    description: {type: DataTypes.TEXT, allowNull: true, field: 'descripcion'}
  },
  {sequelize, tableName: 'Servicios', timestamps: true}
);

export default Amenity;
