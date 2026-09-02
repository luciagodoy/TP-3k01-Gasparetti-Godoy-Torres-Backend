// Secreto de firma de los JWT. A propósito NO tiene valor por defecto: un
// fallback hardcodeado (p. ej. `process.env.JWT_SECRET || 'mySecret'`) implica
// que, si la variable falta en algún entorno, cualquiera que lea este código
// puede firmar tokens válidos y hacerse pasar por cualquier usuario, incluido
// el admin. Preferimos que la app no arranque (ver src/index.ts) antes que
// quedar autenticando con un secreto público.
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'Falta la variable de entorno JWT_SECRET. Definila en tu .env (ver .env.example) con un valor propio y secreto.'
    );
  }
  return secret;
};
