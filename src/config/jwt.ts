export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'Falta la variable de entorno JWT_SECRET. Definila en tu .env con un valor propio y secreto.'
    );
  }
  return secret;
};
