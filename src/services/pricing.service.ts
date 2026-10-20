import {Transaction} from 'sequelize';
import {AdjustmentType, PricingRule, Reservation, RoomCategory} from '../entities';
import {pricingRuleRepository} from '../repositories/pricing-rule.repository';
import {reservationRepository} from '../repositories/reservation.repository';
import {roomCategoryRepository} from '../repositories/room-category.repository';
import {roomRepository} from '../repositories/room.repository';
import {addDays, assertValidRange, calculateNights, today} from '../shared/dates';
import {BadRequestError, NotFoundError} from '../shared/errors';
import {priceForNight} from './pricing-calculator';

export interface AppliedAdjustment {
  ruleId: number;
  adjustmentType: AdjustmentType;
  value: number;
}

export interface NightQuote {
  date: string;
  occupancy: number; // % of the category's rooms booked that night
  basePrice: number;
  price: number;
  occupancyAdjustment: AppliedAdjustment | null;
  leadTimeAdjustment: AppliedAdjustment | null;
}

export interface CategoryQuote {
  categoryId: number;
  categoryName: string;
  startDate: string;
  endDate: string;
  leadDays: number;
  basePricePerNight: number;
  total: number;
  nights: NightQuote[];
}

// The quote endpoint is public: a cap keeps one request from asking for years.
export const MAX_QUOTE_NIGHTS = 365;

const round2 = (value: number): number => Math.round(value * 100) / 100;

const toAdjustment = (rule: PricingRule | null): AppliedAdjustment | null =>
  rule && {ruleId: rule.id, adjustmentType: rule.adjustmentType, value: rule.value};

// Rooms booked on each night of [startDate, startDate + nightCount), per
// category. One pass over the reservations, each one adding 1 to the nights it
// covers inside the range (the check-out day is not one of its nights). Cost:
// the reserved nights, instead of nights x reservations for a public endpoint
// that accepts up to a year.
const bookedPerNight = (reservations: Reservation[], startDate: string, nightCount: number): Map<number, number[]> => {
  const booked = new Map<number, number[]>();
  const endDate = addDays(startDate, nightCount);
  for (const reservation of reservations) {
    const categoryId = reservation.room?.categoryId;
    if (categoryId === undefined) continue;
    let counts = booked.get(categoryId);
    if (!counts) booked.set(categoryId, (counts = new Array<number>(nightCount).fill(0)));
    const first = calculateNights(startDate, reservation.startDate > startDate ? reservation.startDate : startDate);
    const last = calculateNights(startDate, reservation.endDate < endDate ? reservation.endDate : endDate);
    for (let night = first; night < last; night++) counts[night]++;
  }
  return booked;
};

// Dynamic pricing (yield management). The price of a stay is computed night by
// night, from the base price of the category adjusted by:
//  - the occupancy of that category on that night (rooms booked / rooms), and
//  - the lead time: days left from today until the check-in.
// It is recomputed on every request, so it follows the occupancy in real time.
class PricingService {
  constructor(
    private readonly rules = pricingRuleRepository,
    private readonly categories = roomCategoryRepository,
    private readonly rooms = roomRepository,
    private readonly reservations = reservationRepository
  ) {}

  // Quotes every category, or only `categoryId` when given.
  async quote(startDate: string, endDate: string, categoryId?: number, transaction?: Transaction): Promise<CategoryQuote[]> {
    if (!startDate || !endDate) {
      throw new BadRequestError('Datos incompletos', 'startDate y endDate son obligatorios.');
    }
    const nightCount = assertValidRange(startDate, endDate);
    if (nightCount > MAX_QUOTE_NIGHTS) {
      throw new BadRequestError('El rango de fechas es demasiado largo', `Se pueden cotizar hasta ${MAX_QUOTE_NIGHTS} noches.`);
    }

    const categories = await this.findCategories(categoryId, transaction);
    if (categories.length === 0) return [];
    const ids = categories.map((category) => category.id);

    // Three queries in total, whatever the number of nights or categories.
    const rules = await this.rules.findActiveFor(ids, transaction);
    const roomCounts = await this.rooms.countByCategory(ids, transaction);
    const reservations = await this.reservations.findActiveInRange(startDate, endDate, ids, transaction);

    const dates = Array.from({length: nightCount}, (_, i) => addDays(startDate, i));
    const leadDays = calculateNights(today(), startDate);
    const booked = bookedPerNight(reservations, startDate, nightCount);

    return categories.map((category) => {
      const roomCount = roomCounts.get(category.id) ?? 0;
      const bookedOfCategory = booked.get(category.id);

      const nights = dates.map((date, i): NightQuote => {
        const bookedRooms = bookedOfCategory?.[i] ?? 0;
        // Exact value against the tiers; rounding is only for display.
        const occupancy = roomCount > 0 ? Math.min(100, (bookedRooms / roomCount) * 100) : 0;
        const night = priceForNight(category.pricePerNight, {occupancy, leadDays}, rules, category.id);
        return {
          date,
          occupancy: round2(occupancy),
          basePrice: category.pricePerNight,
          price: night.price,
          occupancyAdjustment: toAdjustment(night.occupancyRule),
          leadTimeAdjustment: toAdjustment(night.leadTimeRule)
        };
      });

      return {
        categoryId: category.id,
        categoryName: category.name,
        startDate,
        endDate,
        leadDays,
        basePricePerNight: category.pricePerNight,
        total: round2(nights.reduce((sum, night) => sum + night.price, 0)),
        nights
      };
    });
  }

  async quoteCategory(categoryId: number, startDate: string, endDate: string, transaction?: Transaction): Promise<CategoryQuote> {
    const [quote] = await this.quote(startDate, endDate, categoryId, transaction);
    return quote;
  }

  private async findCategories(categoryId: number | undefined, transaction?: Transaction): Promise<RoomCategory[]> {
    if (categoryId === undefined) return this.categories.findAll({order: [['id', 'ASC']], transaction});
    const category = await this.categories.findById(categoryId, {transaction});
    if (!category) throw new NotFoundError('Categoría no encontrada');
    return [category];
  }
}

export const pricingService = new PricingService();
