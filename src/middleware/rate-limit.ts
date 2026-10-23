import rateLimit from 'express-rate-limit';
const isTest = () => process.env.NODE_ENV === 'test';
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX) || 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: isTest,
  message: {error: 'Demasiadas peticiones. Probá de nuevo en unos minutos.'}
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: isTest,
  message: {error: 'Demasiados intentos de inicio de sesión. Probá de nuevo en unos minutos.'}
});

export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: isTest,
  message: {error: 'Demasiadas cuentas creadas desde esta IP. Probá de nuevo más tarde.'}
});
