import {Model, DataTypes, Optional} from 'sequelize';
import {sequelize} from '../config/database';
import type Province from './province.entity';

interface CityAttributes {
  id: number;
  name: string;
  provinceId: number;
}

interface CityCreationAttributes extends Optional<CityAttributes, 'id'> {}

class City extends Model<CityAttributes, CityCreationAttributes> implements CityAttributes {
  declare id: number;
  declare name: string;
  declare provinceId: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare province?: Province;
}

City.init(
  {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING, allowNull: false, field: 'nombre'},
    provinceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'provinciaId',
      references: {model: 'Provincias', key: 'id'}
    }
  },
  {
    sequelize,
    tableName: 'Ciudades',
    timestamps: true,
    indexes: [{unique: true, fields: ['nombre', 'provinciaId']}]
  }
);

export default City;
