import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import User from '../models/User';

interface LoginBody {
  username: string;
  password: string;
}

export const login = async (
  req: Request<{}, {}, LoginBody>,
  res: Response
): Promise<Response> => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username y password son requeridos' });
    }

    const user = await User.findOne({
      where: { [Op.or]: [{ username }, { email: username }] }
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'mySecret',
      { expiresIn: '1d' }
    );

    const { password: _password, ...usuarioSinPassword } = user.toJSON();

    return res.json({ token, usuario: usuarioSinPassword });
  } catch (error: any) {
    return res.status(500).json({ error: 'Error al iniciar sesión', detalle: error.message });
  }
};
