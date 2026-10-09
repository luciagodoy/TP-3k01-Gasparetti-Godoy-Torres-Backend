import {ForeignKeyConstraintError, ValidationError} from 'sequelize';

export const detalleError = (error: unknown): string | undefined => {
  if (process.env.NODE_ENV === 'production') return undefined;
  return error instanceof Error ? error.message : String(error);
};

// Un error de validación del modelo (campo obligatorio, formato, unicidad) o una
// FK que apunta a algo inexistente los causa el cliente con datos inválidos:
// corresponde 400. Cualquier otra cosa es una falla nuestra y sigue siendo 500.
export const estadoDeError = (error: unknown): 400 | 500 =>
  error instanceof ValidationError || error instanceof ForeignKeyConstraintError ? 400 : 500;
