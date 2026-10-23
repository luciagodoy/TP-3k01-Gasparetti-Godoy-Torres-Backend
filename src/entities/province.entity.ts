import {Model, DataTypes, Optional} from 'sequelize';
import {sequelize} from '../config/database';

interface ProvinceAttributes {
  id: number;
  name: string;
}

interface ProvinceCreationAttributes extends Optional<ProvinceAttributes, 'id'> {}

class Province extends Model<ProvinceAttributes, ProvinceCreationAttributes> implements ProvinceAttributes {
  declare id: number;
  declare name: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Province.init(
  {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING, allowNull: false, unique: true, field: 'nombre'}
  },
  {sequelize, tableName: 'Provincias', timestamps: true}
);

export default Province;
