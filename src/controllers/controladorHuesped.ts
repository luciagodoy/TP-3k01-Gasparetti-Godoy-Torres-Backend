import { Request, Response } from 'express';
import { Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import User from '../models/User';
import Huesped from '../models/Huesped';
import Ciudad from '../models/Ciudad';
import Provincia from '../models/Provincia';
import { detalleError } from '../utils/errorDetalle';

// estructura exacta a recibir en el Body de la petición
interface RegistrarHuespedBody {
  username: string; // Agregado ya que el modelo User lo requiere como obligatorio (allowNull: false)
  email: string;
  password: string;
  telefono: string | null;
  documentoIdentidad: string;
  ciudadId: number;
  pais?: string; // Opcional porque tiene un defaultValue: 'Argentina' en el modelo
}

// Datos propios del perfil de Huesped (no incluye credenciales de User)
interface ActualizarHuespedBody {
  telefono?: string | null;
  documentoIdentidad?: string;
  ciudadId?: number;
  pais?: string;
}

const INCLUDE_PERFIL = [
  { model: User, as: 'usuario', attributes: { exclude: ['password'] } },
  { model: Ciudad, as: 'ciudad', include: [{ model: Provincia, as: 'provincia' }] }
];

// Tipamos el controlador inyectando la interfaz en el tercer parámetro genérico de Request
export const registrarHuesped = async (
  req: Request<{}, {}, RegistrarHuespedBody>,
  res: Response
): Promise<void> => {
  // Inicializamos la variable de la transacción indicando su tipo explícito
  const t: Transaction = await sequelize.transaction();

  try {
    const { username, email, password, telefono, documentoIdentidad, ciudadId, pais } = req.body;
    const nuevoUsuario = await User.create({
      username,
      email,
      password,
      role: 'huesped'
    }, { transaction: t });
    await Huesped.create({
      telefono,
      documentoIdentidad,
      ciudadId,
      pais: pais || 'Argentina',
      userId: nuevoUsuario.id
    }, { transaction: t });

    // impactamos la base de datos
    await t.commit();

    res.status(201).json({ mensaje: 'Huésped creado con éxito' });

  } catch (error: any) {
    await t.rollback();
    res.status(400).json({
      error: 'Error al registrar',
      detalle: detalleError(error)
    });
  }
};

export const listarHuespedes = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Solo cuentas que siguen siendo huésped: si alguien fue promovido a
    // empleado/admin, su perfil de huésped viejo no debe listarse acá.
    const huespedes = await Huesped.findAll({
      include: [
        { model: User, as: 'usuario', attributes: { exclude: ['password'] }, where: { role: 'huesped' } },
        { model: Ciudad, as: 'ciudad', include: [{ model: Provincia, as: 'provincia' }] }
      ]
    });
    res.json(huespedes);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar los huéspedes', detalle: detalleError(error) });
  }
};

export const obtenerMiPerfilHuesped = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const huesped = await Huesped.findOne({
      where: { userId: req.user!.id },
      include: INCLUDE_PERFIL
    });
    if (!huesped) {
      res.status(404).json({ error: 'No existe un perfil de huésped asociado a esta cuenta' });
      return;
    }
    res.json(huesped);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener el perfil del huésped', detalle: detalleError(error) });
  }
};

export const obtenerHuesped = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const huesped = await Huesped.findByPk(req.params.id, { include: INCLUDE_PERFIL });
    if (!huesped) {
      res.status(404).json({ error: 'Huésped no encontrado' });
      return;
    }
    res.json(huesped);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener el huésped', detalle: detalleError(error) });
  }
};

export const actualizarHuesped = async (
  req: Request<{ id: string }, {}, ActualizarHuespedBody>,
  res: Response
): Promise<void> => {
  try {
    const huesped = await Huesped.findByPk(req.params.id);
    if (!huesped) {
      res.status(404).json({ error: 'Huésped no encontrado' });
      return;
    }
    const { telefono, documentoIdentidad, ciudadId, pais } = req.body;
    await huesped.update({
      ...(telefono !== undefined && { telefono }),
      ...(documentoIdentidad !== undefined && { documentoIdentidad }),
      ...(ciudadId !== undefined && { ciudadId }),
      ...(pais !== undefined && { pais })
    });
    res.json(huesped);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al actualizar el huésped', detalle: detalleError(error) });
  }
};

// Elimina la cuenta completa (User + Huesped, vía cascada configurada en el modelo)
export const eliminarHuesped = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const huesped = await Huesped.findByPk(req.params.id);
    if (!huesped) {
      res.status(404).json({ error: 'Huésped no encontrado' });
      return;
    }
    await User.destroy({ where: { id: huesped.userId } });
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({
      error: 'Error al eliminar el huésped',
      detalle: 'Es posible que existan reservas asociadas a este huésped.'
    });
  }
};
