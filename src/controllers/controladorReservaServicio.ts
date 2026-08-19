import { Request, Response } from 'express';
import { Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import ReservaServicio from '../models/ReservaServicio';
import Cupo from '../models/Cupo';
import Servicio from '../models/Servicio';
import Reserva from '../models/Reserva';
import Huesped from '../models/Huesped';
import { buscarPrecioVigente } from './controladorPrecioServicio';

interface CrearReservaServicioBody {
  reservaId: number;
  cupoId: number;
  cantidad: number;
  precioUnitario: number;
}

interface CrearReservaServicioPropioBody {
  reservaId: number;
  cupoId: number;
  cantidad: number;
}

interface ActualizarReservaServicioBody {
  cantidad?: number;
  precioUnitario?: number;
}

interface ListarReservaServicioQuery {
  reservaId?: string;
  cupoId?: string;
}

const INCLUDE_CUPO = [{ model: Cupo, as: 'cupo', include: [{ model: Servicio, as: 'servicio' }] }];

// Lógica transaccional compartida entre el alta administrativa (precio confiado del cliente)
// y el alta de autoservicio del huésped (precio resuelto en el servidor). No se exporta:
// solo la usan los dos handlers públicos de este archivo.
const registrarConsumoServicio = async (
  reservaId: number,
  cupoId: number,
  cantidad: number,
  precioUnitario: number,
  t: Transaction
): Promise<{ status: number; body: any }> => {
  // Bloqueamos la fila del cupo para evitar una condición de carrera entre
  // dos consumos concurrentes del mismo cupo (una transacción sola no alcanza).
  const cupo = await Cupo.findByPk(cupoId, { transaction: t, lock: t.LOCK.UPDATE });
  if (!cupo) {
    return { status: 404, body: { error: 'Cupo no encontrado' } };
  }
  if (cupo.disponibles < cantidad) {
    return {
      status: 400,
      body: { error: 'Cupo insuficiente', mensaje: 'No hay suficiente disponibilidad para la cantidad solicitada.' }
    };
  }

  const montoTotal = cantidad * precioUnitario;
  const linea = await ReservaServicio.create({
    reservaId, cupoId, cantidad, precioUnitario, montoTotal
  }, { transaction: t });

  await cupo.update({ disponibles: cupo.disponibles - cantidad }, { transaction: t });

  return { status: 201, body: linea };
};

export const crearReservaServicio = async (
  req: Request<{}, {}, CrearReservaServicioBody>,
  res: Response
): Promise<void | Response> => {
  const t: Transaction = await sequelize.transaction();

  try {
    const { reservaId, cupoId, cantidad, precioUnitario } = req.body;
    const resultado = await registrarConsumoServicio(reservaId, cupoId, cantidad, precioUnitario, t);
    if (resultado.status >= 400) {
      await t.rollback();
      return res.status(resultado.status).json(resultado.body);
    }
    await t.commit();
    res.status(resultado.status).json(resultado.body);
  } catch (error: any) {
    await t.rollback();
    res.status(400).json({ error: 'Error al registrar el consumo del servicio', detalle: error.message });
  }
};

// Variante de autoservicio: el huésped solo elige cupo y cantidad; el precio SIEMPRE se
// resuelve en el servidor (nunca se confía en un precioUnitario enviado por el cliente,
// a diferencia del endpoint administrativo de arriba), y se valida que la reserva sea propia.
export const crearReservaServicioPropio = async (
  req: Request<{}, {}, CrearReservaServicioPropioBody>,
  res: Response
): Promise<void | Response> => {
  const t: Transaction = await sequelize.transaction();

  try {
    const { reservaId, cupoId, cantidad } = req.body;

    const huesped = await Huesped.findOne({ where: { userId: req.user!.id }, transaction: t });
    if (!huesped) {
      await t.rollback();
      return res.status(404).json({ error: 'No existe un perfil de huésped asociado a esta cuenta' });
    }

    const reserva = await Reserva.findByPk(reservaId, { transaction: t });
    if (!reserva || reserva.huespedId !== huesped.id) {
      await t.rollback();
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const cupo = await Cupo.findByPk(cupoId, { transaction: t });
    if (!cupo) {
      await t.rollback();
      return res.status(404).json({ error: 'Cupo no encontrado' });
    }

    const precioVigente = await buscarPrecioVigente(cupo.servicioId);
    if (!precioVigente) {
      await t.rollback();
      return res.status(400).json({ error: 'El servicio no tiene un precio vigente configurado' });
    }

    const resultado = await registrarConsumoServicio(reservaId, cupoId, cantidad, precioVigente.precio, t);
    if (resultado.status >= 400) {
      await t.rollback();
      return res.status(resultado.status).json(resultado.body);
    }
    await t.commit();
    res.status(resultado.status).json(resultado.body);
  } catch (error: any) {
    await t.rollback();
    res.status(400).json({ error: 'Error al agregar el servicio a tu reserva', detalle: error.message });
  }
};

export const listarReservaServicio = async (
  req: Request<{}, {}, {}, ListarReservaServicioQuery>,
  res: Response
): Promise<void> => {
  try {
    const { reservaId, cupoId } = req.query;
    const where: Record<string, unknown> = {};
    if (reservaId) where.reservaId = parseInt(reservaId, 10);
    if (cupoId) where.cupoId = parseInt(cupoId, 10);

    const lineas = await ReservaServicio.findAll({ where, include: INCLUDE_CUPO });
    res.json(lineas);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar los consumos de servicio', detalle: error.message });
  }
};

export const obtenerReservaServicio = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const linea = await ReservaServicio.findByPk(req.params.id, { include: INCLUDE_CUPO });
    if (!linea) {
      res.status(404).json({ error: 'Consumo de servicio no encontrado' });
      return;
    }
    res.json(linea);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener el consumo de servicio', detalle: error.message });
  }
};

export const actualizarReservaServicio = async (
  req: Request<{ id: string }, {}, ActualizarReservaServicioBody>,
  res: Response
): Promise<void | Response> => {
  const t: Transaction = await sequelize.transaction();

  try {
    const linea = await ReservaServicio.findByPk(req.params.id, { transaction: t });
    if (!linea) {
      await t.rollback();
      return res.status(404).json({ error: 'Consumo de servicio no encontrado' });
    }

    const { cantidad, precioUnitario } = req.body;
    const nuevaCantidad = cantidad ?? linea.cantidad;
    const nuevoPrecioUnitario = precioUnitario ?? linea.precioUnitario;

    if (cantidad !== undefined) {
      const cupo = await Cupo.findByPk(linea.cupoId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!cupo) {
        await t.rollback();
        return res.status(404).json({ error: 'Cupo no encontrado' });
      }
      const delta = linea.cantidad - nuevaCantidad; // cantidad liberada (o consumida extra, si es negativo)
      const nuevosDisponibles = cupo.disponibles + delta;
      if (nuevosDisponibles < 0 || nuevosDisponibles > cupo.cantidad) {
        await t.rollback();
        return res.status(400).json({
          error: 'Cupo insuficiente',
          mensaje: 'No hay suficiente disponibilidad para la nueva cantidad solicitada.'
        });
      }
      await cupo.update({ disponibles: nuevosDisponibles }, { transaction: t });
    }

    await linea.update({
      cantidad: nuevaCantidad,
      precioUnitario: nuevoPrecioUnitario,
      montoTotal: nuevaCantidad * nuevoPrecioUnitario
    }, { transaction: t });

    await t.commit();
    res.json(linea);
  } catch (error: any) {
    await t.rollback();
    res.status(400).json({ error: 'Error al actualizar el consumo de servicio', detalle: error.message });
  }
};

export const eliminarReservaServicio = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void | Response> => {
  const t: Transaction = await sequelize.transaction();

  try {
    const linea = await ReservaServicio.findByPk(req.params.id, { transaction: t });
    if (!linea) {
      await t.rollback();
      return res.status(404).json({ error: 'Consumo de servicio no encontrado' });
    }

    const cupo = await Cupo.findByPk(linea.cupoId, { transaction: t, lock: t.LOCK.UPDATE });
    if (cupo) {
      await cupo.update({ disponibles: cupo.disponibles + linea.cantidad }, { transaction: t });
    }

    await linea.destroy({ transaction: t });
    await t.commit();
    res.status(204).send();
  } catch (error: any) {
    await t.rollback();
    res.status(400).json({ error: 'Error al eliminar el consumo de servicio', detalle: error.message });
  }
};
