// Los errores de dominio llevan el estado HTTP al que corresponden, así los servicios pueden
// informar una falla sin saber nada de Express. El middleware error-handler los
// convierte en respuestas. `message` y `detail` se le muestran al usuario; `code`
// le permite al frontend reconocer un error puntual (p. ej. uno que se puede confirmar).
export class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly detail?: string,
    readonly code?: string
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, detail?: string) {
    super(400, message, detail);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, detail?: string) {
    super(401, message, detail);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, detail?: string) {
    super(404, message, detail);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, detail?: string, code?: string) {
    super(409, message, detail, code);
  }
}

// Mensaje por campo del formulario, p. ej. {email: 'Ese email ya está registrado.'}.
export type FieldErrors = Record<string, string>;

// Errores de un formulario: el frontend usa `fields` para marcar cada campo con su mensaje.
// 400 si los datos tienen mal formato, 409 si chocan con otra cuenta (usuario o email repetido).
export class InvalidFieldsError extends AppError {
  constructor(
    message: string,
    readonly fields: FieldErrors,
    status: 400 | 409 = 400
  ) {
    super(status, message, 'Revisá los campos marcados.');
  }
}

export const errorDetail = (error: unknown): string | undefined => {
  if (process.env.NODE_ENV === 'production') return undefined;
  return error instanceof Error ? error.message : String(error);
};
