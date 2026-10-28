import jwt from 'jsonwebtoken';
import {getJwtSecret} from '../config/jwt';
import {userRepository} from '../repositories/user.repository';
import {trimmed, validateLogin} from '../shared/account-rules';
import {InvalidFieldsError, UnauthorizedError} from '../shared/errors';

export interface Credentials {
  username?: string;
  password?: string;
}

class AuthService {
  constructor(private readonly users = userRepository) {}

  async login({username, password}: Credentials) {
    const missing = validateLogin({username, password});
    if (Object.keys(missing).length > 0) throw new InvalidFieldsError('Faltan datos para iniciar sesión', missing);

    const user = await this.users.findByUsernameOrEmail(trimmed(username));
    // Mismo mensaje exista o no el usuario, para que la API no revele
    // qué nombres de usuario están registrados.
    if (!user || !(await user.comparePassword(password!))) {
      throw new UnauthorizedError('Credenciales inválidas', 'El usuario o la contraseña no son correctos.');
    }

    const token = jwt.sign({id: user.id}, getJwtSecret(), {expiresIn: '1d'});
    return {token, user: user.toSafeJSON()};
  }
}

export const authService = new AuthService();
