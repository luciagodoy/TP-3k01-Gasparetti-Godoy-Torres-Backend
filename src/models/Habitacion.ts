import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database'; 

// 1. Interfaz del modelo
interface HabitacionAttributes {
  id: number;
  numero: number;
  piso: number;
  estadoDisponibilidad: 'disponible' | 'ocupada' | 'mantenimiento';
  categoriaId: number; 
}

// 2. Interfaz para creación
interface HabitacionCreationAttributes extends Optional<HabitacionAttributes, 'id'> {}

// 3. Definición de la Clase
class Habitacion 
  extends Model<HabitacionAttributes, HabitacionCreationAttributes> 
  implements HabitacionAttributes 
{
  public id!: number;
  public numero!: number;
  public piso!: number;
  public estadoDisponibilidad!: 'disponible' | 'ocupada' | 'mantenimiento';
  public categoriaId!: number; 

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// 4. Inicialización
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