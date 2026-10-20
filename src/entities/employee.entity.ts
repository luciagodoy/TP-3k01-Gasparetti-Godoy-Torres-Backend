import {Model, DataTypes, Optional} from 'sequelize';
import {sequelize} from '../config/database';

export const EmployeeStatus = {
  ACTIVE: 'activo',
  INACTIVE: 'inactivo'
} as const;
export type EmployeeStatus = (typeof EmployeeStatus)[keyof typeof EmployeeStatus];

interface EmployeeAttributes {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  position: string;
  status: EmployeeStatus;
}

interface EmployeeCreationAttributes extends Optional<EmployeeAttributes, 'id' | 'status' | 'phone'> {}

class Employee extends Model<EmployeeAttributes, EmployeeCreationAttributes> implements EmployeeAttributes {
  declare id: number;
  declare firstName: string;
  declare lastName: string;
  declare email: string;
  declare phone: string | null;
  declare position: string;
  declare status: EmployeeStatus;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Employee.init(
  {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    firstName: {type: DataTypes.STRING, allowNull: false, field: 'nombre'},
    lastName: {type: DataTypes.STRING, allowNull: false, field: 'apellido'},
    email: {type: DataTypes.STRING, allowNull: false, unique: true, validate: {isEmail: true}},
    phone: {type: DataTypes.STRING, allowNull: true, field: 'telefono'},
    position: {type: DataTypes.STRING, allowNull: false, field: 'puesto'},
    status: {
      type: DataTypes.ENUM(EmployeeStatus.ACTIVE, EmployeeStatus.INACTIVE),
      allowNull: false,
      defaultValue: EmployeeStatus.ACTIVE,
      field: 'estado'
    }
  },
  {sequelize, tableName: 'Empleados', timestamps: true}
);

export default Employee;
