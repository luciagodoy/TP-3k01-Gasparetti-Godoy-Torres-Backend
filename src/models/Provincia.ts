import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ProvinciaAttributes {
  id: number;
  nombre: string;
}

interface ProvinciaCreationAttributes extends Optional<ProvinciaAttributes, 'id'> {}

class Provincia
  extends Model<ProvinciaAttributes, ProvinciaCreationAttributes>
  implements ProvinciaAttributes
{
  declare id: number;
  declare nombre: string;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Provincia.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
}, {
  sequelize,
  tableName: 'Provincias',
  timestamps: true
});

export default Provincia;
