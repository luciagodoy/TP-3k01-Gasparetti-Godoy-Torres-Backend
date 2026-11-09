import {BadRequestError} from './errors';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const HOTEL_TIME_ZONE = 'America/Argentina/Buenos_Aires';

const toUtcMidnight = (date: string): number => new Date(`${date}T00:00:00Z`).getTime();

export const calculateNights = (startDate: string, endDate: string): number =>
  Math.round((toUtcMidnight(endDate) - toUtcMidnight(startDate)) / MS_PER_DAY);

export const addDays = (date: string, days: number): string => new Date(toUtcMidnight(date) + days * MS_PER_DAY).toISOString().slice(0, 10);

// 'en-CA' formatea como YYYY-MM-DD.
const hotelDate = new Intl.DateTimeFormat('en-CA', {timeZone: HOTEL_TIME_ZONE});
const hotelTime = new Intl.DateTimeFormat('en-GB', {timeZone: HOTEL_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});

export const today = (): string => hotelDate.format(new Date());

// Fecha (YYYY-MM-DD) y hora (HH:MM) del hotel, tomadas del mismo instante para que
// no queden de días distintos a la medianoche. Como strings se comparan bien con < y >.
export const hotelNow = (): {date: string; time: string} => {
  const now = new Date();
  return {date: hotelDate.format(now), time: hotelTime.format(now)};
};

// 'YYYY-MM-DD' -> 'DD/MM/YYYY', para los mensajes que ve el usuario.
export const displayDate = (date: string): string => date.split('-').reverse().join('/');

// Valida una estadía y devuelve su cantidad de noches.
export const assertValidRange = (startDate: string, endDate: string): number => {
  const nights = calculateNights(startDate, endDate);
  if (!(nights > 0)) {
    throw new BadRequestError('El rango de fechas es inválido', 'La fecha de fin debe ser posterior a la fecha de inicio.');
  }
  return nights;
};
