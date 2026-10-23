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

// Todas las asociaciones viven acá para que cada punto de entrada (app, tests, scripts
// de seed) obtenga el mismo grafo de modelos con sólo importar el índice de entidades.

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

// RESTRICT, no el SET NULL por defecto: un categoryId nulo significa "todas las categorías",
// así que borrar una categoría convertiría sus reglas propias en globales.
const pricingRuleCategory = {foreignKey: 'categoryId', onDelete: 'RESTRICT'};
RoomCategory.hasMany(PricingRule, {...pricingRuleCategory, as: 'pricingRules'});
PricingRule.belongsTo(RoomCategory, {...pricingRuleCategory, as: 'category'});
