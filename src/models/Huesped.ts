import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';
import Ciudad from './Ciudad';


interface HuespedAttributes {
  id: number;
  telefono: string | null;
  documentoIdentidad: string;
  ciudadId: number;
  pais: string;
  userId?: number;
}

interface HuespedCreationAttributes extends Optional<HuespedAttributes, 'id'> {}

class Huesped
  extends Model<HuespedAttributes, HuespedCreationAttributes>
  implements HuespedAttributes
{
  declare id: number;
  declare telefono: string | null;
  declare documentoIdentidad: string;
  declare ciudadId: number;
  declare pais: string;
  declare userId: number;

  // Timestamps automáticos de Sequelize
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare usuario?: User;
  declare ciudad?: Ciudad;
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
  ciudadId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Ciudades',
      key: 'id'
    }
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

Ciudad.hasMany(Huesped, { foreignKey: 'ciudadId', as: 'huespedes' });
Huesped.belongsTo(Ciudad, { foreignKey: 'ciudadId', as: 'ciudad' });

export default Huesped;
