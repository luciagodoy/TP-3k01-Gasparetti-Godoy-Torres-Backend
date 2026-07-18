import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User'; 


interface HuespedAttributes {
  id: number;
  telefono: string | null;
  documentoIdentidad: string;
  ciudad: string;
  provincia: string;
  pais: string;
  userId?: number; 
}

interface HuespedCreationAttributes extends Optional<HuespedAttributes, 'id'> {}

class Huesped 
  extends Model<HuespedAttributes, HuespedCreationAttributes> 
  implements HuespedAttributes 
{
  public id!: number;
  public telefono!: string | null;
  public documentoIdentidad!: string;
  public ciudad!: string;
  public provincia!: string;
  public pais!: string;
  public userId!: number;

  // Timestamps automáticos de Sequelize
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}


Huesped.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: true
  },
  documentoIdentidad: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  ciudad: {
    type: DataTypes.STRING,
    allowNull: false
  },
  provincia: {
    type: DataTypes.STRING,
    allowNull: false
  },
  pais: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Argentina'
  }
}, {
  sequelize,
  tableName: 'Huespedes',
  timestamps: true
});

// === CONFIGURAR RELACIONES  ===

User.hasOne(Huesped, { 
  foreignKey: 'userId', 
  as: 'perfilHuesped', 
  onDelete: 'CASCADE' 
});

Huesped.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'usuario' 
});

export default Huesped;