import { Request, Response } from 'express';
import User from '../models/User';

interface UserBody {
  username: string;
  email: string;
  password: string;
  role?: 'huesped' | 'empleado' | 'admin';
}

const limpiarUsuario = (usuario: User) => {
  const datos = usuario.toJSON() as unknown as { password?: string; [key: string]: unknown };
  const { password, ...usuarioSinPassword } = datos;
  return usuarioSinPassword;
};

export const crearUsuario = async (
  req: Request<{}, {}, UserBody>,
  res: Response
): Promise<void> => {
  try {
    const { username, email, password, role = 'huesped' } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: 'username, email y password son requeridos' });
      return;
    }

    const usuario = await User.create({ username, email, password, role });
    res.status(201).json(limpiarUsuario(usuario));
  } catch (error: any) {
    res.status(400).json({ error: 'Error al crear el usuario', detalle: error.message });
  }
};

export const listarUsuarios = async (_req: Request, res: Response): Promise<void> => {
  try {
    const usuarios = await User.findAll();
    res.json(usuarios.map(limpiarUsuario));
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar los usuarios', detalle: error.message });
  }
};

export const obtenerUsuario = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const usuario = await User.findByPk(req.params.id);
    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json(limpiarUsuario(usuario));
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener el usuario', detalle: error.message });
  }
};

export const actualizarUsuario = async (
  req: Request<{ id: string }, {}, Partial<UserBody>>,
  res: Response
): Promise<void> => {
  try {
    const usuario = await User.findByPk(req.params.id);
    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const { username, email, password, role } = req.body;
    await usuario.update({
      ...(username !== undefined && { username }),
      ...(email !== undefined && { email }),
      ...(password !== undefined && { password }),
      ...(role !== undefined && { role })
    });

    res.json(limpiarUsuario(usuario));
  } catch (error: any) {
    res.status(400).json({ error: 'Error al actualizar el usuario', detalle: error.message });
  }
};

export const eliminarUsuario = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const usuario = await User.findByPk(req.params.id);
    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    await usuario.destroy();
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: 'Error al eliminar el usuario', detalle: error.message });
  }
};
