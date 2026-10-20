import User from './user.entity';
import Guest from './guest.entity';
import Province from './province.entity';
import City from './city.entity';
import RoomCategory from './room-category.entity';
import Room from './room.entity';
import Reservation from './reservation.entity';
import Amenity from './amenity.entity';
import AmenityQuota from './amenity-quota.entity';
import AmenityPrice from './amenity-price.entity';
import ReservationAmenity from './reservation-amenity.entity';
import PricingRule from './pricing-rule.entity';

// All associations live here so every entry point (app, tests, seed scripts)
// gets the same model graph just by importing the entities index.
//
// When a foreign key is not declared in the entity (guestId, roomId), the
// object form maps the English attribute to the existing column.

RoomCategory.hasMany(Room, {foreignKey: 'categoryId', as: 'rooms'});
Room.belongsTo(RoomCategory, {foreignKey: 'categoryId', as: 'category'});

Province.hasMany(City, {foreignKey: 'provinceId', as: 'cities'});
City.belongsTo(Province, {foreignKey: 'provinceId', as: 'province'});

User.hasOne(Guest, {foreignKey: 'userId', as: 'guestProfile', onDelete: 'CASCADE'});
Guest.belongsTo(User, {foreignKey: 'userId', as: 'user'});

City.hasMany(Guest, {foreignKey: 'cityId', as: 'guests'});
Guest.belongsTo(City, {foreignKey: 'cityId', as: 'city'});

const guestForeignKey = {name: 'guestId', field: 'huespedId'};
Guest.hasMany(Reservation, {foreignKey: guestForeignKey, as: 'reservations'});
Reservation.belongsTo(Guest, {foreignKey: guestForeignKey, as: 'guest'});

const roomForeignKey = {name: 'roomId', field: 'habitacionId'};
Room.hasMany(Reservation, {foreignKey: roomForeignKey, as: 'reservations'});
Reservation.belongsTo(Room, {foreignKey: roomForeignKey, as: 'room'});

Amenity.hasMany(AmenityQuota, {foreignKey: 'amenityId', as: 'quotas'});
AmenityQuota.belongsTo(Amenity, {foreignKey: 'amenityId', as: 'amenity'});

Amenity.hasMany(AmenityPrice, {foreignKey: 'amenityId', as: 'prices'});
AmenityPrice.belongsTo(Amenity, {foreignKey: 'amenityId', as: 'amenity'});

Reservation.hasMany(ReservationAmenity, {foreignKey: 'reservationId', as: 'consumedAmenities'});
ReservationAmenity.belongsTo(Reservation, {foreignKey: 'reservationId', as: 'reservation'});

AmenityQuota.hasMany(ReservationAmenity, {foreignKey: 'quotaId', as: 'reservationAmenities'});
ReservationAmenity.belongsTo(AmenityQuota, {foreignKey: 'quotaId', as: 'quota'});

// RESTRICT, not the default SET NULL: a null categoryId means "every category",
// so deleting a category would silently turn its own rules into global ones.
const pricingRuleCategory = {foreignKey: 'categoryId', onDelete: 'RESTRICT'};
RoomCategory.hasMany(PricingRule, {...pricingRuleCategory, as: 'pricingRules'});
PricingRule.belongsTo(RoomCategory, {...pricingRuleCategory, as: 'category'});
