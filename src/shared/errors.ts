// Los errores de dominio llevan el estado HTTP al que corresponden, así los servicios pueden
// informar una falla sin saber nada de Express. El middleware error-handler los
// convierte en respuestas. `message` y `detail` se le muestran al usuario.
export class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly detail?: string
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
  constructor(message: string, detail?: string) {
    super(409, message, detail);
  }
}

export const errorDetail = (error: unknown): string | undefined => {
  if (process.env.NODE_ENV === 'production') return undefined;
  return error instanceof Error ? error.message : String(error);
};
