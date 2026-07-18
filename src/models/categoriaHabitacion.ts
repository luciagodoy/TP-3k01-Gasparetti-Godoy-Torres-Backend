import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database'; 
interface CategoriaHabitacionAttributes {
  id: number;
  denominacion: string;
  descripcion: string | null; 
  capacidadPersonas: number;
}

interface CategoriaHabitacionCreationAttributes extends Optional<CategoriaHabitacionAttributes, 'id'> {}

class CategoriaHabitacion 
  extends Model<CategoriaHabitacionAttributes, CategoriaHabitacionCreationAttributes> 
  implements CategoriaHabitacionAttributes 
{
  public id!: number;
  public denominacion!: string;
  public descripcion!: string | null;
  public capacidadPersonas!: number;

  // Timestamps 
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
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
  }
}, {
  sequelize,
  tableName: 'CategoriasHabitacion',
  timestamps: true
});
export default CategoriaHabitacion;