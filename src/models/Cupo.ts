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
  public id!: number;
  public cantidad!: number;
  public disponibles!: number;
  public servicioId!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

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
