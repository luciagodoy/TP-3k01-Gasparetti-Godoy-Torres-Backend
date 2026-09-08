import rateLimit from 'express-rate-limit';

// Los endpoints públicos sin autenticar (login y alta de huésped) son los que
// un atacante puede martillar sin límite: fuerza bruta de contraseñas en uno y
// creación masiva de cuentas basura en el otro. Los límites son holgados a
// propósito para no molestar durante el uso normal ni las demos, pero cortan
// de raíz cualquier intento automatizado.
//
// En los tests se desactivan para que la suite sea determinística y no dependa
// de cuántas veces se loguee cada caso.
//
// Limitación conocida: el contador vive en memoria del proceso (MemoryStore, el
// store por defecto). Alcanza para una sola instancia como la de este TP, pero
// se reinicia en cada deploy y no se comparte entre réplicas. Si en algún
// momento se corre con más de una instancia, hay que pasar a un store
// compartido (Redis) o al rate limit del proxy/plataforma.
// Requiere además TRUST_PROXY si hay un proxy inverso adelante (ver app.ts).
const esTest = () => process.env.NODE_ENV === 'test';

// Límite general para toda la API: los listados públicos (categorías, ciudades,
// habitaciones) no tienen autenticación y algunos devuelven bastantes filas, así
// que conviene un techo aunque sea holgado. Es tolerante a propósito: en una
// demo desde la facultad varias personas comparten una misma IP pública (NAT) y
// un límite chico las bloquearía a todas. Se puede ajustar con RATE_LIMIT_MAX.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: Number(process.env.RATE_LIMIT_MAX) || 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: esTest,
  message: {error: 'Demasiadas peticiones. Probá de nuevo en unos minutos.'}
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: esTest,
  message: {error: 'Demasiados intentos de inicio de sesión. Probá de nuevo en unos minutos.'}
});

export const registroLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: esTest,
  message: {error: 'Demasiadas cuentas creadas desde esta IP. Probá de nuevo más tarde.'}
});
