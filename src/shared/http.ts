import {BadRequestError} from './errors';

// Route params arrive as strings; anything that is not a positive integer is
// rejected before it reaches the database.
export const parseId = (value: string | undefined): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestError('Identificador inválido', 'El id debe ser un número entero positivo.');
  }
  return id;
};

// Optional numeric query param: undefined when missing or empty.
export const optionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  if (Number.isNaN(number)) {
    throw new BadRequestError('Parámetro inválido', `"${String(value)}" no es un número.`);
  }
  return number;
};

// Copies only the listed keys that are actually present, so a PUT with a partial
// body leaves the other columns untouched (and unknown keys are ignored).
export const pickDefined = <T extends object, K extends keyof T>(source: T, keys: readonly K[]): Partial<Pick<T, K>> => {
  const result: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    if (source[key] !== undefined) result[key] = source[key];
  }
  return result;
};
