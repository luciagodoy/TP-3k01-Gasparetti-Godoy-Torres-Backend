import {describe, it, expect, beforeEach} from 'vitest';
import {Amenity, AmenityPrice} from '../../entities';
import {amenityPriceService} from '../../services/amenity-price.service';

describe('amenityPriceService.findCurrentPrice', () => {
  let amenityId: number;

  beforeEach(async () => {
    const amenity = await Amenity.create({name: 'Desayuno', description: null});
    amenityId = amenity.id;
  });

  it('returns null when the amenity has no price at all', async () => {
    expect(await amenityPriceService.findCurrentPrice(amenityId, '2026-06-01')).toBeNull();
  });

  it('ignores a price whose validity has not started yet', async () => {
    await AmenityPrice.create({price: 1000, validFrom: '2026-07-01', validTo: null, amenityId});

    expect(await amenityPriceService.findCurrentPrice(amenityId, '2026-06-01')).toBeNull();
  });

  it('ignores a price whose validity has already ended', async () => {
    await AmenityPrice.create({price: 1000, validFrom: '2026-01-01', validTo: '2026-03-01', amenityId});

    expect(await amenityPriceService.findCurrentPrice(amenityId, '2026-06-01')).toBeNull();
  });

  it('returns an open-ended price (no end date)', async () => {
    await AmenityPrice.create({price: 1500, validFrom: '2026-01-01', validTo: null, amenityId});

    const price = await amenityPriceService.findCurrentPrice(amenityId, '2026-06-01');
    expect(price?.price).toBe(1500);
  });

  it('when several prices overlap, the one that started most recently wins', async () => {
    await AmenityPrice.create({price: 1000, validFrom: '2026-01-01', validTo: null, amenityId});
    await AmenityPrice.create({price: 1200, validFrom: '2026-05-01', validTo: null, amenityId});

    const price = await amenityPriceService.findCurrentPrice(amenityId, '2026-06-01');
    expect(price?.price).toBe(1200);
  });
});
