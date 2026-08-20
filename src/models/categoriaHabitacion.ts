import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
interface CategoriaHabitacionAttributes {
  id: number;
  denominacion: string;
  descripcion: string | null;
  capacidadPersonas: number;
  imagenUrl: string | null;
  precioNoche: number;
}

interface CategoriaHabitacionCreationAttributes extends Optional<CategoriaHabitacionAttributes, 'id'> {}

class CategoriaHabitacion
  extends Model<CategoriaHabitacionAttributes, CategoriaHabitacionCreationAttributes>
  implements CategoriaHabitacionAttributes
{
  declare id: number;
  declare denominacion: string;
  declare descripcion: string | null;
  declare capacidadPersonas: number;
  declare imagenUrl: string | null;
  declare precioNoche: number;

  // Timestamps
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

CategoriaHabitacion.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  denominacion: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  capacidadPersonas: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  imagenUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  precioNoche: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    get() {
      const value = this.getDataValue('precioNoche');
      return value ? parseFloat(value as any) : 0;
    }
  }
}, {
  sequelize,
  tableName: 'CategoriasHabitacion',
  timestamps: true
});
export default CategoriaHabitacion;
