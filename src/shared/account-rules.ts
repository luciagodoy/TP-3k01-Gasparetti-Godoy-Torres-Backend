import {FieldErrors} from './errors';

// Reglas de formato de las cuentas. El frontend aplica las mismas (src/utils/accountRules.js)
// para avisar antes de enviar; las de acá son las que valen.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const PASSWORD_MIN = 8;

const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOCUMENT_PATTERN = /^[A-Za-z0-9]{6,15}$/;
const PHONE_PATTERN = /^[0-9+()\s-]{6,20}$/;

export interface RegistrationFields {
  username?: unknown;
  email?: unknown;
  password?: unknown;
  phone?: unknown;
  documentNumber?: unknown;
  cityId?: unknown;
}

export const trimmed = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

// El email se guarda en minúsculas para que 'Ana@Mail.com' y 'ana@mail.com' sean la misma cuenta.
export const normalizeEmail = (email: unknown): string => trimmed(email).toLowerCase();

export function validateRegistration(input: RegistrationFields): FieldErrors {
  const errors: FieldErrors = {};
  const username = trimmed(input.username);
  const email = normalizeEmail(input.email);
  const password = typeof input.password === 'string' ? input.password : '';
  const phone = trimmed(input.phone);
  const documentNumber = trimmed(input.documentNumber);
  const cityId = Number(input.cityId);

  if (!username) errors.username = 'Ingresá un nombre de usuario.';
  else if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    errors.username = `El usuario debe tener entre ${USERNAME_MIN} y ${USERNAME_MAX} caracteres.`;
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username = 'Usá sólo letras, números, punto, guion o guion bajo.';
  }

  if (!email) errors.email = 'Ingresá tu email.';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'El email no tiene un formato válido.';

  if (!password) errors.password = 'Ingresá una contraseña.';
  else if (password.length < PASSWORD_MIN) {
    errors.password = `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    errors.password = 'La contraseña debe combinar letras y números.';
  }

  if (phone && !PHONE_PATTERN.test(phone)) {
    errors.phone = 'El teléfono sólo puede tener números, espacios, +, - y paréntesis.';
  }

  if (!documentNumber) errors.documentNumber = 'Ingresá tu documento.';
  else if (!DOCUMENT_PATTERN.test(documentNumber)) {
    errors.documentNumber = 'El documento debe tener entre 6 y 15 letras o números, sin puntos ni espacios.';
  }

  if (!Number.isInteger(cityId) || cityId <= 0) errors.cityId = 'Elegí tu provincia y ciudad.';

  return errors;
}

export function validateLogin(input: {username?: unknown; password?: unknown}): FieldErrors {
  const errors: FieldErrors = {};
  if (!trimmed(input.username)) errors.username = 'Ingresá tu usuario o email.';
  if (typeof input.password !== 'string' || !input.password) errors.password = 'Ingresá tu contraseña.';
  return errors;
}
