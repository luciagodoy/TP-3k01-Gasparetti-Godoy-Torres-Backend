import {Model, DataTypes, Optional} from 'sequelize';
import {sequelize} from '../config/database';
import type Reservation from './reservation.entity';
import type AmenityQuota from './amenity-quota.entity';

// An amenity consumed during a reservation. The unit price is copied at
// booking time so later price changes do not alter past bills.
interface ReservationAmenityAttributes {
  id: number;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  reservationId: number;
  quotaId: number;
}

interface ReservationAmenityCreationAttributes extends Optional<ReservationAmenityAttributes, 'id'> {}

class ReservationAmenity
  extends Model<ReservationAmenityAttributes, ReservationAmenityCreationAttributes>
  implements ReservationAmenityAttributes
{
  declare id: number;
  declare quantity: number;
  declare unitPrice: number;
  declare totalAmount: number;
  declare reservationId: number;
  declare quotaId: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare reservation?: Reservation;
  declare quota?: AmenityQuota;
}

ReservationAmenity.init(
  {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    quantity: {type: DataTypes.INTEGER, allowNull: false, validate: {min: 1}, field: 'cantidad'},
    unitPrice: {type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'precioUnitario'},
    totalAmount: {type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'montoTotal'},
    reservationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'reservaId',
      references: {model: 'Reservas', key: 'id'}
    },
    quotaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'cupoId',
      references: {model: 'Cupos', key: 'id'}
    }
  },
  {sequelize, tableName: 'ReservaServicios', timestamps: true}
);

export default ReservationAmenity;
