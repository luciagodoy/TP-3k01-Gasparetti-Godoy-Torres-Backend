import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import type CategoriaHabitacion from './categoriaHabitacion';

interface HabitacionAttributes {
  id: number;
  numero: number;
  piso: number;
  estadoDisponibilidad: 'disponible' | 'ocupada' | 'mantenimiento';
  categoriaId: number; 
}

interface HabitacionCreationAttributes extends Optional<HabitacionAttributes, 'id'> {}
class Habitacion 
  extends Model<HabitacionAttributes, HabitacionCreationAttributes> 
  implements HabitacionAttributes 
{
  declare id: number;
  declare numero: number;
  declare piso: number;
  declare estadoDisponibilidad: 'disponible' | 'ocupada' | 'mantenimiento';
  declare categoriaId: number;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare categoria?: CategoriaHabitacion;
}
Habitacion.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  numero: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  piso: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  estadoDisponibilidad: {
    type: DataTypes.ENUM('disponible', 'ocupada', 'mantenimiento'),
    allowNull: false,
    defaultValue: 'disponible'
  },
  categoriaId: { 
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'CategoriasHabitacion', 
      key: 'id'
    }
  }
}, {
  sequelize,
  tableName: 'Habitaciones',
  timestamps: true
});

export default Habitacion;