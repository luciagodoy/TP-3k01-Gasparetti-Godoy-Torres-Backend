import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Servicio from './Servicio';

interface CupoAttributes {
  id: number;
  cantidad: number;
  disponibles: number;
  servicioId: number;
}

interface CupoCreationAttributes extends Optional<CupoAttributes, 'id'> {}

class Cupo
  extends Model<CupoAttributes, CupoCreationAttributes>
  implements CupoAttributes
{
  declare id: number;
  declare cantidad: number;
  declare disponibles: number;
  declare servicioId: number;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  public servicio?: Servicio;
}

Cupo.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 0 }
  },
  disponibles: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 0 }
  },
  servicioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Servicios',
      key: 'id'
    }
  }
}, {
  sequelize,
  tableName: 'Cupos',
  timestamps: true
});

Servicio.hasMany(Cupo, { foreignKey: 'servicioId', as: 'cupos' });
Cupo.belongsTo(Servicio, { foreignKey: 'servicioId', as: 'servicio' });

export default Cupo;
