import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Provincia from './Provincia';

interface CiudadAttributes {
  id: number;
  nombre: string;
  provinciaId: number;
}

interface CiudadCreationAttributes extends Optional<CiudadAttributes, 'id'> {}

class Ciudad
  extends Model<CiudadAttributes, CiudadCreationAttributes>
  implements CiudadAttributes
{
  public id!: number;
  public nombre!: string;
  public provinciaId!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public provincia?: Provincia;
}

Ciudad.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  provinciaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Provincias',
      key: 'id'
    }
  }
}, {
  sequelize,
  tableName: 'Ciudades',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['nombre', 'provinciaId'] }
  ]
});

Provincia.hasMany(Ciudad, { foreignKey: 'provinciaId', as: 'ciudades' });
Ciudad.belongsTo(Provincia, { foreignKey: 'provinciaId', as: 'provincia' });

export default Ciudad;
