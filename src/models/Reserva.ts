import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import Huesped from './Huesped';
import Habitacion from './Habitacion';

//   define atributos de la Reserva
interface ReservaAttributes {
  id: number;
  fechaInicio: string; // se maneja como string 'YYYY-MM-DD'
  fechaFin: string;
  estado: 'pendiente' | 'check-in' | 'check-out' | 'cancelada';
  montoTotal: number;
  huespedId?: number;    
  habitacionId?: number; 
}

//  Interfaz para la creación 
interface ReservaCreationAttributes extends Optional<ReservaAttributes, 'id'> {}

// Extensión de la clase Model
class Reserva 
  extends Model<ReservaAttributes, ReservaCreationAttributes> 
  implements ReservaAttributes 
{
  public id!: number;
  public fechaInicio!: string;
  public fechaFin!: string;
  public estado!: 'pendiente' | 'check-in' | 'check-out' | 'cancelada';
  public montoTotal!: number;
  public huespedId!: number;
  public habitacionId!: number;

  // Timestamps automáticos de Sequelize
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Inicialización del modelo
Reserva.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fechaInicio: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  fechaFin: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'check-in', 'check-out', 'cancelada'),
    allowNull: false,
    defaultValue: 'pendiente'
  },
  montoTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    get() {
      const value = this.getDataValue('montoTotal');
      return value ? parseFloat(value as any) : 0;
    }
  }
}, {
  sequelize,
  tableName: 'Reservas',
  timestamps: true
});

// === CONFIGURAR RELACIONES  ===

// Un Huesped tiene muchas Reservas
Huesped.hasMany(Reserva, { foreignKey: 'huespedId', as: 'reservas' });
Reserva.belongsTo(Huesped, { foreignKey: 'huespedId', as: 'huesped' });

// Una Habitacion tiene muchas Reservas
Habitacion.hasMany(Reserva, { foreignKey: 'habitacionId', as: 'reservas' });
Reserva.belongsTo(Habitacion, { foreignKey: 'habitacionId', as: 'habitacion' });

export default Reserva;