import rateLimit from 'express-rate-limit';

// Los endpoints públicos sin autenticar (login y alta de huésped) son los que
// un atacante puede martillar sin límite: fuerza bruta de contraseñas en uno y
// creación masiva de cuentas basura en el otro. Los límites son holgados a
// propósito para no molestar durante el uso normal ni las demos, pero cortan
// de raíz cualquier intento automatizado.
//
// En los tests se desactivan para que la suite sea determinística y no dependa
// de cuántas veces se loguee cada caso.
const esTest = () => process.env.NODE_ENV === 'test';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: esTest,
  message: { error: 'Demasiados intentos de inicio de sesión. Probá de nuevo en unos minutos.' }
});

export const registroLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: esTest,
  message: { error: 'Demasiadas cuentas creadas desde esta IP. Probá de nuevo más tarde.' }
});
