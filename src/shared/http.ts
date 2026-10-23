import {BadRequestError} from './errors';

// Los parámetros de ruta llegan como strings; todo lo que no sea un entero positivo
// se rechaza antes de llegar a la base de datos.
export const parseId = (value: string | undefined): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestError('Identificador inválido', 'El id debe ser un número entero positivo.');
  }
  return id;
};

// Parámetro numérico opcional de la query: undefined cuando falta o está vacío.
export const optionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  if (Number.isNaN(number)) {
    throw new BadRequestError('Parámetro inválido', `"${String(value)}" no es un número.`);
  }
  return number;
};

// Copia sólo las claves listadas que realmente están presentes, así un PUT con un cuerpo
// parcial deja intactas las demás columnas (y las claves desconocidas se ignoran).
export const pickDefined = <T extends object, K extends keyof T>(source: T, keys: readonly K[]): Partial<Pick<T, K>> => {
  const result: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    if (source[key] !== undefined) result[key] = source[key];
  }
  return result;
};
