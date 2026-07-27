import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface EmpleadoAttributes {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  puesto: string;
  estado: 'activo' | 'inactivo';
}

interface EmpleadoCreationAttributes extends Optional<EmpleadoAttributes, 'id'> {}

class Empleado
  extends Model<EmpleadoAttributes, EmpleadoCreationAttributes>
  implements EmpleadoAttributes
{
  public id!: number;
  public nombre!: string;
  public apellido!: string;
  public email!: string;
  public telefono!: string | null;
  public puesto!: string;
  public estado!: 'activo' | 'inactivo';

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Empleado.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  apellido: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: true
  },
  puesto: {
    type: DataTypes.STRING,
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('activo', 'inactivo'),
    allowNull: false,
    defaultValue: 'activo'
  }
}, {
  sequelize,
  tableName: 'Empleados',
  timestamps: true
});

export default Empleado;
