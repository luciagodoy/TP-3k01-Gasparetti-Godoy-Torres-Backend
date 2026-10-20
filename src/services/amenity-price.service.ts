import {AmenityPrice} from '../entities';
import {amenityPriceRepository} from '../repositories/amenity-price.repository';
import {BadRequestError, NotFoundError} from '../shared/errors';
import {today} from '../shared/dates';
import {pickDefined} from '../shared/http';
import {BaseService} from './base.service';

export interface AmenityPriceInput {
  price: number;
  validFrom: string;
  validTo?: string | null;
  amenityId: number;
}

const EDITABLE_FIELDS = ['price', 'validFrom', 'validTo', 'amenityId'] as const;

class AmenityPriceService extends BaseService<AmenityPrice> {
  protected readonly notFoundMessage = 'Precio de servicio no encontrado';
  protected readonly deleteBlockedMessage = 'El precio tiene registros asociados.';

  constructor(private readonly prices = amenityPriceRepository) {
    super(prices);
  }

  // `onlyCurrent` returns at most one price: the one valid today.
  async list(amenityId?: number, onlyCurrent = false): Promise<AmenityPrice[]> {
    if (onlyCurrent) {
      if (amenityId === undefined) {
        throw new BadRequestError('amenityId es requerido para consultar el precio vigente');
      }
      const current = await this.findCurrentPrice(amenityId);
      return current ? [current] : [];
    }
    return this.prices.findAllWithAmenity(amenityId);
  }

  findCurrentPrice(amenityId: number, date: string = today()): Promise<AmenityPrice | null> {
    return this.prices.findValidOn(amenityId, date);
  }

  async getWithAmenity(id: number): Promise<AmenityPrice> {
    const price = await this.prices.findByIdWithAmenity(id);
    if (!price) throw new NotFoundError(this.notFoundMessage);
    return price;
  }

  create(input: AmenityPriceInput): Promise<AmenityPrice> {
    return this.prices.create({
      price: input.price,
      validFrom: input.validFrom,
      validTo: input.validTo ?? null,
      amenityId: input.amenityId
    });
  }

  async update(id: number, input: Partial<AmenityPriceInput>): Promise<AmenityPrice> {
    const price = await this.getById(id);
    return this.prices.update(price, pickDefined(input, EDITABLE_FIELDS));
  }
}

export const amenityPriceService = new AmenityPriceService();
