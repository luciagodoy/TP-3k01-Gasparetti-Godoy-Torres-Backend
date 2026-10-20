import {Model, DataTypes, Optional} from 'sequelize';
import {sequelize} from '../config/database';
import type Guest from './guest.entity';
import type Room from './room.entity';
import type ReservationAmenity from './reservation-amenity.entity';

export const ReservationStatus = {
  PENDING: 'pendiente',
  CHECKED_IN: 'check-in',
  CHECKED_OUT: 'check-out',
  CANCELLED: 'cancelada'
} as const;
export type ReservationStatus = (typeof ReservationStatus)[keyof typeof ReservationStatus];

interface ReservationAttributes {
  id: number;
  startDate: string; // DATEONLY: 'YYYY-MM-DD'
  endDate: string;
  status: ReservationStatus;
  totalAmount: number; // lodging only, amenities are billed separately
  guestId?: number;
  roomId?: number;
}

interface ReservationCreationAttributes extends Optional<ReservationAttributes, 'id' | 'status'> {}

class Reservation
  extends Model<ReservationAttributes, ReservationCreationAttributes>
  implements ReservationAttributes
{
  declare id: number;
  declare startDate: string;
  declare endDate: string;
  declare status: ReservationStatus;
  declare totalAmount: number;
  declare guestId: number;
  declare roomId: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare guest?: Guest;
  declare room?: Room;
  declare consumedAmenities?: ReservationAmenity[];
}

Reservation.init(
  {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    startDate: {type: DataTypes.DATEONLY, allowNull: false, field: 'fechaInicio'},
    endDate: {type: DataTypes.DATEONLY, allowNull: false, field: 'fechaFin'},
    status: {
      type: DataTypes.ENUM(
        ReservationStatus.PENDING,
        ReservationStatus.CHECKED_IN,
        ReservationStatus.CHECKED_OUT,
        ReservationStatus.CANCELLED
      ),
      allowNull: false,
      defaultValue: ReservationStatus.PENDING,
      field: 'estado'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'montoTotal',
      get() {
        const value = this.getDataValue('totalAmount');
        return value ? parseFloat(value as unknown as string) : 0;
      }
    }
    // guestId and roomId are added by their associations (see associations.ts).
  },
  {sequelize, tableName: 'Reservas', timestamps: true}
);

export default Reservation;
