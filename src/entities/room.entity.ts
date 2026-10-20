import {Model, DataTypes, Optional} from 'sequelize';
import {sequelize} from '../config/database';
import type RoomCategory from './room-category.entity';

export const RoomStatus = {
  AVAILABLE: 'disponible',
  OCCUPIED: 'ocupada',
  MAINTENANCE: 'mantenimiento'
} as const;
export type RoomStatus = (typeof RoomStatus)[keyof typeof RoomStatus];

interface RoomAttributes {
  id: number;
  number: number;
  floor: number;
  status: RoomStatus;
  categoryId: number;
}

interface RoomCreationAttributes extends Optional<RoomAttributes, 'id' | 'status'> {}

class Room extends Model<RoomAttributes, RoomCreationAttributes> implements RoomAttributes {
  declare id: number;
  declare number: number;
  declare floor: number;
  declare status: RoomStatus;
  declare categoryId: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare category?: RoomCategory;
}

Room.init(
  {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    number: {type: DataTypes.INTEGER, allowNull: false, unique: true, field: 'numero'},
    floor: {type: DataTypes.INTEGER, allowNull: false, field: 'piso'},
    status: {
      type: DataTypes.ENUM(RoomStatus.AVAILABLE, RoomStatus.OCCUPIED, RoomStatus.MAINTENANCE),
      allowNull: false,
      defaultValue: RoomStatus.AVAILABLE,
      field: 'estadoDisponibilidad'
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'categoriaId',
      references: {model: 'CategoriasHabitacion', key: 'id'}
    }
  },
  {sequelize, tableName: 'Habitaciones', timestamps: true}
);

export default Room;
