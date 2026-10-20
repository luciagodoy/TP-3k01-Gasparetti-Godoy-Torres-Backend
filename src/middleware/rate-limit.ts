import rateLimit from 'express-rate-limit';

// The unauthenticated endpoints (login and guest sign-up) are the ones an
// attacker can hammer freely: password brute force on one, mass creation of
// junk accounts on the other. The limits are generous on purpose so they do not
// bother normal use or demos, but they stop automated attempts.
//
// Known limitation: counters live in process memory (MemoryStore, the default).
// That only holds with one long-lived process (Docker, a single VM). On Vercel
// each serverless instance has its own counters and they are lost on every
// cold start, so there the real limit is the platform's (Vercel Firewall rate
// limiting rules) or a shared store (Redis, e.g. Upstash). Behind a reverse
// proxy TRUST_PROXY must be set too (see app.ts).
//
// Disabled in tests so the suite does not depend on how many times it logs in.
const isTest = () => process.env.NODE_ENV === 'test';

// The messages are shown to the user, hence Spanish.

// Whole API. Public listings have no authentication and some return many rows,
// so a ceiling is still worth having. Lenient on purpose: in a demo at the
// university many people share one public IP (NAT). Tunable with RATE_LIMIT_MAX.
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
