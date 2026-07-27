import { Request, Response } from 'express';
import { Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import ReservaServicio from '../models/ReservaServicio';
import Cupo from '../models/Cupo';
import Servicio from '../models/Servicio';

interface CrearReservaServicioBody {
  reservaId: number;
  cupoId: number;
  cantidad: number;
  precioUnitario: number;
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

export const crearReservaServicio = async (
  req: Request<{}, {}, CrearReservaServicioBody>,
  res: Response
): Promise<void | Response> => {
  const t: Transaction = await sequelize.transaction();

  try {
    const { reservaId, cupoId, cantidad, precioUnitario } = req.body;

    // Bloqueamos la fila del cupo para evitar una condición de carrera entre
    // dos consumos concurrentes del mismo cupo (una transacción sola no alcanza).
    const cupo = await Cupo.findByPk(cupoId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!cupo) {
      await t.rollback();
      return res.status(404).json({ error: 'Cupo no encontrado' });
    }
    if (cupo.disponibles < cantidad) {
      await t.rollback();
      return res.status(400).json({
        error: 'Cupo insuficiente',
        mensaje: 'No hay suficiente disponibilidad para la cantidad solicitada.'
      });
    }

    const montoTotal = cantidad * precioUnitario;
    const linea = await ReservaServicio.create({
      reservaId,
      cupoId,
      cantidad,
      precioUnitario,
      montoTotal
    }, { transaction: t });

    await cupo.update({ disponibles: cupo.disponibles - cantidad }, { transaction: t });

    await t.commit();
    res.status(201).json(linea);
  } catch (error: any) {
    await t.rollback();
    res.status(400).json({ error: 'Error al registrar el consumo del servicio', detalle: error.message });
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
