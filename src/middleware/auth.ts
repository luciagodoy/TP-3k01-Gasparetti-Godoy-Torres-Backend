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

// Factory: requires a valid token and, when roles are given, one of them.
// No roles => any authenticated user.
//
// 401 and 403 are kept apart on purpose: 401 = "I don't know who you are"
// (no token, invalid token or deleted user), 403 = "I know who you are, but
// your role is not enough". The frontend logs out on 401; on 403 the session
// is still valid and only the error should be shown.
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
  simple: requireRole(), // any logged-in user (guest, employee or admin)
  staff: requireRole(Role.EMPLOYEE, Role.ADMIN), // day-to-day hotel operations
  admin: requireRole(Role.ADMIN) // accounts and staff management
};
