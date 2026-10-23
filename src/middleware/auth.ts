import {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import {Role, User} from '../entities';
import {getJwtSecret} from '../config/jwt';
import {userRepository} from '../repositories/user.repository';

interface DecodedToken {
  id: number;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      token?: string;
    }
  }
}

//
// 401 y 403 se mantienen separados a propósito: 401 = "no sé quién sos"
// (sin token, token inválido o usuario borrado), 403 = "sé quién sos, pero
// tu rol no alcanza". El frontend cierra la sesión con 401; con 403 la sesión
// sigue siendo válida y sólo hay que mostrar el error.
const requireRole = (...allowedRoles: Role[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let user: User | null;
    let token: string;
    try {
      const authHeader = req.header('Authorization');
      if (!authHeader) throw new Error('missing Authorization header');

      token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, getJwtSecret()) as DecodedToken;

      user = await userRepository.findById(decoded.id);
      if (!user) throw new Error('user no longer exists');
    } catch {
      res.status(401).send({error: 'Please authenticate.'});
      return;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      res.status(403).send({error: 'No tenés permiso para realizar esta acción.'});
      return;
    }

    req.token = token;
    req.user = user;
    next();
  };
};

export default {
  simple: requireRole(), // cualquier usuario logueado (huésped, empleado o admin)
  staff: requireRole(Role.EMPLOYEE, Role.ADMIN), // operación diaria del hotel
  admin: requireRole(Role.ADMIN) // gestión de cuentas y del personal
};
