// Domain errors carry the HTTP status they map to, so services can report a
// failure without knowing anything about Express. The error-handler middleware
// turns them into responses. `message` and `detail` are shown to the end user,
// which is why they stay in Spanish.
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

// Raw messages from Sequelize or the MySQL driver leak column and constraint
// names: useful while developing, free information for anyone probing the API
// in production. `undefined` makes JSON.stringify drop the key.
export const errorDetail = (error: unknown): string | undefined => {
  if (process.env.NODE_ENV === 'production') return undefined;
  return error instanceof Error ? error.message : String(error);
};
