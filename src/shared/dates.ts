import {BadRequestError} from './errors';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const HOTEL_TIME_ZONE = 'America/Argentina/Buenos_Aires';

const toUtcMidnight = (date: string): number => new Date(`${date}T00:00:00Z`).getTime();


export const calculateNights = (startDate: string, endDate: string): number =>
  Math.round((toUtcMidnight(endDate) - toUtcMidnight(startDate)) / MS_PER_DAY);

export const addDays = (date: string, days: number): string => new Date(toUtcMidnight(date) + days * MS_PER_DAY).toISOString().slice(0, 10);

// 'en-CA' formatea como YYYY-MM-DD.
export const today = (): string => new Intl.DateTimeFormat('en-CA', {timeZone: HOTEL_TIME_ZONE}).format(new Date());

// Valida una estadía y devuelve su cantidad de noches.
export const assertValidRange = (startDate: string, endDate: string): number => {
  const nights = calculateNights(startDate, endDate);
  if (!(nights > 0)) {
    throw new BadRequestError('El rango de fechas es inválido', 'La fecha de fin debe ser posterior a la fecha de inicio.');
  }
  return nights;
};
