import {describe, it, expect, afterEach, vi} from 'vitest';
import {calculateNights, today} from '../../shared/dates';

describe('today', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // The lead-time pricing tier and the current amenity price depend on it: in
  // UTC the day changes at 21:00 Argentina time, three hours early.
  it('returns the calendar day in Argentina, not in UTC', () => {
    vi.useFakeTimers({toFake: ['Date']});
    vi.setSystemTime(new Date('2026-10-20T01:30:00Z')); // 2026-10-19 22:30 in Argentina
    expect(today()).toBe('2026-10-19');
  });

  it('changes day at midnight Argentina time', () => {
    vi.useFakeTimers({toFake: ['Date']});
    vi.setSystemTime(new Date('2026-10-20T03:00:00Z')); // 2026-10-20 00:00 in Argentina
    expect(today()).toBe('2026-10-20');
  });
});

describe('calculateNights', () => {
  it('counts the nights between two DATEONLY dates', () => {
    expect(calculateNights('2026-08-01', '2026-08-04')).toBe(3);
  });

  it('returns 0 when the end date equals the start date', () => {
    expect(calculateNights('2026-08-01', '2026-08-01')).toBe(0);
  });

  it('returns a negative value when the end date is before the start date', () => {
    expect(calculateNights('2026-08-05', '2026-08-01')).toBe(-4);
  });

  it('does not shift a day because of the local time zone (Date + DATEONLY gotcha)', () => {
    // Parsed as local time instead of explicit UTC, a negative offset could
    // subtract a day and give 30 instead of 31.
    expect(calculateNights('2026-01-01', '2026-02-01')).toBe(31);
  });
});
