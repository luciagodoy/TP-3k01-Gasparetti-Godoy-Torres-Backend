import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

// 1. Interfaz que describe el contenido del Token JWT al decodificarse
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

type Rol = 'huesped' | 'empleado' | 'admin';

// Factory: exige un token válido y, si se pasan roles, que el usuario tenga uno de ellos.
// Sin roles => cualquier usuario autenticado (equivalente al viejo "simple").
const requireRole = (...rolesPermitidos: Rol[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      const authHeader = req.header('Authorization');
      if (!authHeader) throw new Error();

      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mySecret') as DecodedToken;

      // Buscamos el usuario en MySQL por su ID primario
      const user = await User.findByPk(decoded.id);
      if (!user) throw new Error();
      if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(user.role)) throw new Error();

      // Inyectamos de forma segura los datos en la petición
      req.token = token;
      req.user = user;

      next();
    } catch (e) {
      return res.status(401).send({ error: 'Please authenticate.' });
    }
  };
};

export default {
  simple: requireRole(), // cualquier usuario logueado (huésped, empleado o admin)
  staff: requireRole('empleado', 'admin'), // operación diaria del hotel
  admin: requireRole('admin') // gestión de usuarios y empleados
};