import {Model, DataTypes, Optional} from 'sequelize';
import {sequelize} from '../config/database';
import type User from './user.entity';
import type City from './city.entity';

interface GuestAttributes {
  id: number;
  phone: string | null;
  documentNumber: string;
  cityId: number;
  country: string;
  userId?: number;
}

interface GuestCreationAttributes extends Optional<GuestAttributes, 'id' | 'country'> {}

class Guest extends Model<GuestAttributes, GuestCreationAttributes> implements GuestAttributes {
  declare id: number;
  declare phone: string | null;
  declare documentNumber: string;
  declare cityId: number;
  declare country: string;
  declare userId: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare user?: User;
  declare city?: City;
}

Guest.init(
  {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    phone: {type: DataTypes.STRING, allowNull: true, field: 'telefono'},
    documentNumber: {type: DataTypes.STRING, allowNull: false, unique: true, field: 'documentoIdentidad'},
    cityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'ciudadId',
      references: {model: 'Ciudades', key: 'id'}
    },
    country: {type: DataTypes.STRING, allowNull: false, defaultValue: 'Argentina', field: 'pais'}
    // userId is added by the User <-> Guest association (see associations.ts).
  },
  {sequelize, tableName: 'Huespedes', timestamps: true}
);

export default Guest;
