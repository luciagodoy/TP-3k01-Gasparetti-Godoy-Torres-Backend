import {BadRequestError} from './errors';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// The hotel's calendar day. The server may run in UTC, where after 21:00 in
// Argentina it is already "tomorrow": prices that depend on how many days are
// left until the check-in would change tier three hours early.
export const HOTEL_TIME_ZONE = 'America/Argentina/Buenos_Aires';

const toUtcMidnight = (date: string): number => new Date(`${date}T00:00:00Z`).getTime();

// Nights between two DATEONLY strings ('YYYY-MM-DD'). Both dates are pinned to
// UTC midnight: `new Date('2026-11-01')` alone would shift a day in UTC-3.
export const calculateNights = (startDate: string, endDate: string): number =>
  Math.round((toUtcMidnight(endDate) - toUtcMidnight(startDate)) / MS_PER_DAY);

export const addDays = (date: string, days: number): string => new Date(toUtcMidnight(date) + days * MS_PER_DAY).toISOString().slice(0, 10);

// 'en-CA' formats as YYYY-MM-DD.
export const today = (): string => new Intl.DateTimeFormat('en-CA', {timeZone: HOTEL_TIME_ZONE}).format(new Date());

// Validates a stay and returns its number of nights.
export const assertValidRange = (startDate: string, endDate: string): number => {
  const nights = calculateNights(startDate, endDate);
  if (!(nights > 0)) {
    throw new BadRequestError('El rango de fechas es inválido', 'La fecha de fin debe ser posterior a la fecha de inicio.');
  }
  return nights;
};
