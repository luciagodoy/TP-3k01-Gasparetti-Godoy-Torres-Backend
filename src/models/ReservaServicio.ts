import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Reserva from './Reserva';
import Cupo from './Cupo';

interface ReservaServicioAttributes {
  id: number;
  cantidad: number;
  precioUnitario: number;
  montoTotal: number;
  reservaId: number;
  cupoId: number;
}

interface ReservaServicioCreationAttributes extends Optional<ReservaServicioAttributes, 'id'> {}

class ReservaServicio
  extends Model<ReservaServicioAttributes, ReservaServicioCreationAttributes>
  implements ReservaServicioAttributes
{
  declare id: number;
  declare cantidad: number;
  declare precioUnitario: number;
  declare montoTotal: number;
  declare reservaId: number;
  declare cupoId: number;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  public cupo?: Cupo;
}

ReservaServicio.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 }
  },
  precioUnitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  montoTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  reservaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Reservas',
      key: 'id'
    }
  },
  cupoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Cupos',
      key: 'id'
    }
  }
}, {
  sequelize,
  tableName: 'ReservaServicios',
  timestamps: true
});

Reserva.hasMany(ReservaServicio, { foreignKey: 'reservaId', as: 'serviciosConsumidos' });
ReservaServicio.belongsTo(Reserva, { foreignKey: 'reservaId', as: 'reserva' });

Cupo.hasMany(ReservaServicio, { foreignKey: 'cupoId', as: 'reservaServicios' });
ReservaServicio.belongsTo(Cupo, { foreignKey: 'cupoId', as: 'cupo' });

export default ReservaServicio;
