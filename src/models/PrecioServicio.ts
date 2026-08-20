import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Servicio from './Servicio';

interface PrecioServicioAttributes {
  id: number;
  precio: number;
  fechaVigenciaDesde: string;
  fechaVigenciaHasta: string | null;
  servicioId: number;
}

interface PrecioServicioCreationAttributes extends Optional<PrecioServicioAttributes, 'id'> {}

class PrecioServicio
  extends Model<PrecioServicioAttributes, PrecioServicioCreationAttributes>
  implements PrecioServicioAttributes
{
  declare id: number;
  declare precio: number;
  declare fechaVigenciaDesde: string;
  declare fechaVigenciaHasta: string | null;
  declare servicioId: number;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  public servicio?: Servicio;
}

PrecioServicio.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    get() {
      const value = this.getDataValue('precio');
      return value ? parseFloat(value as any) : 0;
    }
  },
  fechaVigenciaDesde: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  fechaVigenciaHasta: {
    type: DataTypes.DATEONLY,
    allowNull: true
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
  tableName: 'PreciosServicio',
  timestamps: true
});

Servicio.hasMany(PrecioServicio, { foreignKey: 'servicioId', as: 'precios' });
PrecioServicio.belongsTo(Servicio, { foreignKey: 'servicioId', as: 'servicio' });

export default PrecioServicio;
