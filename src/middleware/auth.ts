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

const simple = async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) throw new Error();

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mySecret') as DecodedToken;

    // Buscamos el usuario en MySQL por su ID primario
    const user = await User.findByPk(decoded.id);
    if (!user) throw new Error();

    // Inyectamos de forma segura los datos en la petición
    req.token = token;
    req.user = user;
    
    next();
  } catch (e) {
    return res.status(401).send({ error: 'Please authenticate.' });
  }
};
const enhance = async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) throw new Error();

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mySecret') as DecodedToken;

    const user = await User.findByPk(decoded.id);
    
    // Filtro estricto de seguridad: validamos el rol del modelo Sequelize ('admin')
    if (!user || user.role !== 'admin') throw new Error();

    req.token = token;
    req.user = user;
    
    next();
  } catch (e) {
    return res.status(401).send({ error: 'Please authenticate.' });
  }
};

export default { simple, enhance };