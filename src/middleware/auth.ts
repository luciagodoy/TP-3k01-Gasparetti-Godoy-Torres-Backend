import {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import {getJwtSecret} from '../config/jwt';

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
//
// 401 y 403 se separan a propósito: 401 = "no sé quién sos" (sin token, token
// inválido o usuario borrado) y 403 = "sé quién sos, pero tu rol no alcanza".
// El front cierra la sesión ante un 401; con un 403 la sesión sigue siendo
// válida y sólo corresponde mostrar el error.
const requireRole = (...rolesPermitidos: Rol[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    let user: User | null;
    let token: string;
    try {
      const authHeader = req.header('Authorization');
      if (!authHeader) throw new Error();

      token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, getJwtSecret()) as DecodedToken;

      // Buscamos el usuario en MySQL por su ID primario
      user = await User.findByPk(decoded.id);
      if (!user) throw new Error();
    } catch (e) {
      return res.status(401).send({error: 'Please authenticate.'});
    }

    if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(user.role)) {
      return res.status(403).send({error: 'No tenés permiso para realizar esta acción.'});
    }

    // Inyectamos de forma segura los datos en la petición
    req.token = token;
    req.user = user;

    next();
  };
};

export default {
  simple: requireRole(), // cualquier usuario logueado (huésped, empleado o admin)
  staff: requireRole('empleado', 'admin'), // operación diaria del hotel
  admin: requireRole('admin') // gestión de usuarios y empleados
};
