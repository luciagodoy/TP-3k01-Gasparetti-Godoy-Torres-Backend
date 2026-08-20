import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ServicioAttributes {
  id: number;
  nombre: string;
  descripcion: string | null;
}

interface ServicioCreationAttributes extends Optional<ServicioAttributes, 'id'> {}

class Servicio
  extends Model<ServicioAttributes, ServicioCreationAttributes>
  implements ServicioAttributes
{
  declare id: number;
  declare nombre: string;
  declare descripcion: string | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Servicio.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'Servicios',
  timestamps: true
});

export default Servicio;
