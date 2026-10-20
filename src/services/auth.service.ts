import jwt from 'jsonwebtoken';
import {getJwtSecret} from '../config/jwt';
import {userRepository} from '../repositories/user.repository';
import {BadRequestError, UnauthorizedError} from '../shared/errors';

export interface Credentials {
  username?: string; // username or email
  password?: string;
}

class AuthService {
  constructor(private readonly users = userRepository) {}

  async login({username, password}: Credentials) {
    if (!username || !password) {
      throw new BadRequestError('username y password son requeridos');
    }

    const user = await this.users.findByUsernameOrEmail(username);
    // Same message whether the user exists or not, so the API does not reveal
    // which usernames are registered.
    if (!user || !(await user.comparePassword(password))) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const token = jwt.sign({id: user.id}, getJwtSecret(), {expiresIn: '1d'});
    return {token, user: user.toSafeJSON()};
  }
}

export const authService = new AuthService();
