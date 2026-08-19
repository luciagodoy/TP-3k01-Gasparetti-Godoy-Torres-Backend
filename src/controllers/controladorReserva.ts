import { Request, Response } from 'express';
import { Op, Transaction } from 'sequelize';
import PDFDocument from 'pdfkit';
import { sequelize } from '../config/database';
import Reserva from '../models/Reserva';
import Habitacion from '../models/Habitacion';
import CategoriaHabitacion from '../models/categoriaHabitacion';
import Huesped from '../models/Huesped';
import User from '../models/User';
import ReservaServicio from '../models/ReservaServicio';
import Cupo from '../models/Cupo';
import Servicio from '../models/Servicio';

interface CrearReservaBody {
  fechaInicio: string;
  fechaFin: string;
  huespedId: number;
  habitacionId: number;
  montoTotal: number;
}

interface ActualizarReservaBody {
  fechaInicio?: string;
  fechaFin?: string;
  habitacionId?: number;
  montoTotal?: number;
  estado?: 'pendiente' | 'check-in' | 'check-out' | 'cancelada';
}

interface ListarReservasQuery {
  huespedId?: string;
  habitacionId?: string;
  estado?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

// Reutilizado por crear/actualizar/listar para comprobar solapamiento de fechas.
const condicionSolapamiento = (fechaInicio: string, fechaFin: string) => [
  { fechaInicio: { [Op.between]: [fechaInicio, fechaFin] } },
  { fechaFin: { [Op.between]: [fechaInicio, fechaFin] } },
  {
    [Op.and]: [
      { fechaInicio: { [Op.lte]: fechaInicio } },
      { fechaFin: { [Op.gte]: fechaFin } }
    ]
  }
];

// Resuelve el id de Huesped asociado a la cuenta autenticada (req.user.id es el id de User).
const resolverMiHuespedId = async (userId: number, t?: Transaction): Promise<number | null> => {
  const huesped = await Huesped.findOne({ where: { userId }, transaction: t });
  return huesped ? huesped.id : null;
};

export const calcularNoches = (fechaInicio: string, fechaFin: string): number => {
  const inicio = new Date(`${fechaInicio}T00:00:00Z`);
  const fin = new Date(`${fechaFin}T00:00:00Z`);
  const msPorDia = 24 * 60 * 60 * 1000;
  return Math.round((fin.getTime() - inicio.getTime()) / msPorDia);
};


const buscarSolapamiento = (
  habitacionId: number,
  fechaInicio: string,
  fechaFin: string,
  excludeId?: number,
  transaction?: Transaction
) => {
  return Reserva.findOne({
    where: {
      habitacionId,
      estado: { [Op.ne]: 'cancelada' },
      ...(excludeId !== undefined && { id: { [Op.ne]: excludeId } }),
      [Op.or]: condicionSolapamiento(fechaInicio, fechaFin)
    },
    transaction
  });
};

export const crearReserva = async (
  req: Request<{}, {}, CrearReservaBody>,
  res: Response
): Promise<void | Response> => {
  const t: Transaction = await sequelize.transaction();

  try {
    const { fechaInicio, fechaFin, huespedId, habitacionId, montoTotal } = req.body;
    const reservaExistente = await buscarSolapamiento(habitacionId, fechaInicio, fechaFin, undefined, t);

    if (reservaExistente) {
      await t.rollback();
      return res.status(400).json({
        error: 'Habitación no disponible',
        mensaje: 'La habitación ya se encuentra reservada para las fechas seleccionadas.'
      });
    }

    const nuevaReserva = await Reserva.create({
      fechaInicio,
      fechaFin,
      huespedId,
      habitacionId,
      montoTotal,
      estado: 'pendiente'
    }, { transaction: t });

    await t.commit();

    res.status(201).json({
      mensaje: '¡Reserva realizada con éxito!',
      reserva: nuevaReserva
    });

  } catch (error: any) {
    await t.rollback();
    res.status(500).json({
      error: 'Error al procesar la reserva',
      detalle: error.message
    });
  }
};

export const listarReservas = async (
  req: Request<{}, {}, {}, ListarReservasQuery>,
  res: Response
): Promise<void> => {
  try {
    const { huespedId, habitacionId, estado, fechaInicio, fechaFin } = req.query;
    const where: Record<string, unknown> = {};
    if (huespedId) where.huespedId = parseInt(huespedId, 10);
    if (habitacionId) where.habitacionId = parseInt(habitacionId, 10);
    if (estado) where.estado = estado;
    if (fechaInicio && fechaFin) {
      where[Op.or as unknown as string] = condicionSolapamiento(fechaInicio, fechaFin);
    }

    const reservas = await Reserva.findAll({
      where,
      include: [{ model: Habitacion, as: 'habitacion' }]
    });
    res.json(reservas);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar las reservas', detalle: error.message });
  }
};

export const obtenerReserva = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const reserva = await Reserva.findByPk(req.params.id, {
      include: [{ model: Habitacion, as: 'habitacion' }]
    });
    if (!reserva) {
      res.status(404).json({ error: 'Reserva no encontrada' });
      return;
    }
    res.json(reserva);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener la reserva', detalle: error.message });
  }
};

export const actualizarReserva = async (
  req: Request<{ id: string }, {}, ActualizarReservaBody>,
  res: Response
): Promise<void | Response> => {
  const t: Transaction = await sequelize.transaction();

  try {
    const reserva = await Reserva.findByPk(req.params.id, { transaction: t });
    if (!reserva) {
      await t.rollback();
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const { fechaInicio, fechaFin, habitacionId, montoTotal, estado } = req.body;
    const nuevaFechaInicio = fechaInicio ?? reserva.fechaInicio;
    const nuevaFechaFin = fechaFin ?? reserva.fechaFin;
    const nuevaHabitacionId = habitacionId ?? reserva.habitacionId;

    // Si cambian fechas y/o habitación, re-chequeamos solapamiento excluyendo esta misma reserva
    if (fechaInicio !== undefined || fechaFin !== undefined || habitacionId !== undefined) {
      const reservaSolapada = await buscarSolapamiento(
        nuevaHabitacionId,
        nuevaFechaInicio,
        nuevaFechaFin,
        reserva.id,
        t
      );
      if (reservaSolapada) {
        await t.rollback();
        return res.status(400).json({
          error: 'Habitación no disponible',
          mensaje: 'La habitación ya se encuentra reservada para las fechas seleccionadas.'
        });
      }
    }

    await reserva.update({
      fechaInicio: nuevaFechaInicio,
      fechaFin: nuevaFechaFin,
      habitacionId: nuevaHabitacionId,
      ...(montoTotal !== undefined && { montoTotal }),
      ...(estado !== undefined && { estado })
    }, { transaction: t });

    await t.commit();
    res.json(reserva);
  } catch (error: any) {
    await t.rollback();
    res.status(400).json({ error: 'Error al actualizar la reserva', detalle: error.message });
  }
};

export const eliminarReserva = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const reserva = await Reserva.findByPk(req.params.id);
    if (!reserva) {
      res.status(404).json({ error: 'Reserva no encontrada' });
      return;
    }
    await reserva.destroy();
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: 'Error al eliminar la reserva', detalle: error.message });
  }
};

// === AUTOSERVICIO DEL HUÉSPED ===

interface CrearReservaPropiaBody {
  habitacionId: number;
  fechaInicio: string;
  fechaFin: string;
}

export const crearReservaPropia = async (
  req: Request<{}, {}, CrearReservaPropiaBody>,
  res: Response
): Promise<void | Response> => {
  const t: Transaction = await sequelize.transaction();

  try {
    const huespedId = await resolverMiHuespedId(req.user!.id, t);
    if (!huespedId) {
      await t.rollback();
      return res.status(404).json({ error: 'No existe un perfil de huésped asociado a esta cuenta' });
    }

    const { habitacionId, fechaInicio, fechaFin } = req.body;
    const noches = calcularNoches(fechaInicio, fechaFin);
    if (noches <= 0) {
      await t.rollback();
      return res.status(400).json({
        error: 'El rango de fechas es inválido',
        mensaje: 'La fecha de fin debe ser posterior a la fecha de inicio.'
      });
    }

    const habitacion = await Habitacion.findByPk(habitacionId, {
      include: [{ model: CategoriaHabitacion, as: 'categoria' }],
      transaction: t
    });
    if (!habitacion || !habitacion.categoria) {
      await t.rollback();
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }

    const reservaExistente = await buscarSolapamiento(habitacionId, fechaInicio, fechaFin, undefined, t);
    if (reservaExistente) {
      await t.rollback();
      return res.status(400).json({
        error: 'Habitación no disponible',
        mensaje: 'La habitación ya se encuentra reservada para las fechas seleccionadas.'
      });
    }

    const montoTotal = noches * habitacion.categoria.precioNoche;
    const nuevaReserva = await Reserva.create({
      fechaInicio, fechaFin, huespedId, habitacionId, montoTotal, estado: 'pendiente'
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ mensaje: '¡Reserva realizada con éxito!', reserva: nuevaReserva });
  } catch (error: any) {
    await t.rollback();
    res.status(500).json({ error: 'Error al procesar la reserva', detalle: error.message });
  }
};

export const listarMisReservas = async (req: Request, res: Response): Promise<void> => {
  try {
    const huespedId = await resolverMiHuespedId(req.user!.id);
    if (!huespedId) {
      res.status(404).json({ error: 'No existe un perfil de huésped asociado a esta cuenta' });
      return;
    }
    const reservas = await Reserva.findAll({
      where: { huespedId },
      include: [
        { model: Habitacion, as: 'habitacion', include: [{ model: CategoriaHabitacion, as: 'categoria' }] },
        { model: ReservaServicio, as: 'serviciosConsumidos', include: [{ model: Cupo, as: 'cupo', include: [{ model: Servicio, as: 'servicio' }] }] }
      ],
      order: [['fechaInicio', 'DESC']]
    });
    res.json(reservas);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar tus reservas', detalle: error.message });
  }
};

export const cancelarReservaPropia = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void | Response> => {
  const t: Transaction = await sequelize.transaction();

  try {
    const huespedId = await resolverMiHuespedId(req.user!.id, t);
    if (!huespedId) {
      await t.rollback();
      return res.status(404).json({ error: 'No existe un perfil de huésped asociado a esta cuenta' });
    }
    const reserva = await Reserva.findByPk(req.params.id, { transaction: t });
    if (!reserva || reserva.huespedId !== huespedId) {
      await t.rollback();
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    if (reserva.estado !== 'pendiente') {
      await t.rollback();
      return res.status(400).json({
        error: 'Transición inválida',
        mensaje: `No se puede cancelar una reserva en estado "${reserva.estado}".`
      });
    }
    await reserva.update({ estado: 'cancelada' }, { transaction: t });
    await t.commit();
    res.json({ mensaje: 'Reserva cancelada correctamente', reserva });
  } catch (error: any) {
    await t.rollback();
    res.status(400).json({ error: 'Error al cancelar la reserva', detalle: error.message });
  }
};

// === CHECK-IN / CHECK-OUT / COMPROBANTE ===

export const realizarCheckIn = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void | Response> => {
  const t: Transaction = await sequelize.transaction();

  try {
    const reserva = await Reserva.findByPk(req.params.id, { transaction: t });
    if (!reserva) {
      await t.rollback();
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    if (reserva.estado !== 'pendiente') {
      await t.rollback();
      return res.status(400).json({
        error: 'Transición inválida',
        mensaje: `No se puede hacer check-in de una reserva en estado "${reserva.estado}".`
      });
    }

    const habitacion = await Habitacion.findByPk(reserva.habitacionId, { transaction: t });
    if (!habitacion) {
      await t.rollback();
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }

    await reserva.update({ estado: 'check-in' }, { transaction: t });
    await habitacion.update({ estadoDisponibilidad: 'ocupada' }, { transaction: t });

    await t.commit();
    res.json({ mensaje: 'Check-in realizado con éxito', reserva });
  } catch (error: any) {
    await t.rollback();
    res.status(400).json({ error: 'Error al procesar el check-in', detalle: error.message });
  }
};

const COMPROBANTE_INCLUDES = [
  { model: Huesped, as: 'huesped', include: [{ model: User, as: 'usuario', attributes: { exclude: ['password'] } }] },
  { model: Habitacion, as: 'habitacion' },
  { model: ReservaServicio, as: 'serviciosConsumidos', include: [{ model: Cupo, as: 'cupo', include: [{ model: Servicio, as: 'servicio' }] }] }
];

export const realizarCheckOut = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void | Response> => {
  const t: Transaction = await sequelize.transaction();

  try {
    const reserva = await Reserva.findByPk(req.params.id, { transaction: t });
    if (!reserva) {
      await t.rollback();
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    if (reserva.estado !== 'check-in') {
      await t.rollback();
      return res.status(400).json({
        error: 'Transición inválida',
        mensaje: `No se puede hacer check-out de una reserva en estado "${reserva.estado}".`
      });
    }

    const habitacion = await Habitacion.findByPk(reserva.habitacionId, { transaction: t });
    if (!habitacion) {
      await t.rollback();
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }

    await reserva.update({ estado: 'check-out' }, { transaction: t });
    await habitacion.update({ estadoDisponibilidad: 'disponible' }, { transaction: t });

    await t.commit();

    const reservaCompleta = await Reserva.findByPk(req.params.id, { include: COMPROBANTE_INCLUDES });
    if (!reservaCompleta) {
      res.status(404).json({ error: 'Reserva no encontrada' });
      return;
    }
    generarComprobantePDF(reservaCompleta, res);
  } catch (error: any) {
    await t.rollback();
    res.status(400).json({ error: 'Error al procesar el check-out', detalle: error.message });
  }
};

export const descargarComprobante = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const reserva = await Reserva.findByPk(req.params.id, { include: COMPROBANTE_INCLUDES });
    if (!reserva) {
      res.status(404).json({ error: 'Reserva no encontrada' });
      return;
    }
    if (reserva.estado !== 'check-out') {
      res.status(400).json({ error: 'La reserva aún no registra un check-out.' });
      return;
    }
    generarComprobantePDF(reserva, res);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al generar el comprobante', detalle: error.message });
  }
};

// Genera y transmite el PDF del comprobante de pago directamente en la respuesta HTTP.

function generarComprobantePDF(reserva: Reserva, res: Response): void {
  const habitacion = reserva.habitacion;
  const huesped = reserva.huesped;
  const usuario = huesped?.usuario;
  const servicios = reserva.serviciosConsumidos || [];

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="comprobante-reserva-${reserva.id}.pdf"`);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);

  // Header
  doc.fontSize(18).text('Hotel DSW', { align: 'center' });
  doc.fontSize(12).text('Comprobante de Pago', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10)
    .text(`Comprobante N°: ${reserva.id}`, { align: 'right' })
    .text(`Fecha de emisión: ${new Date().toLocaleDateString('es-AR')}`, { align: 'right' });
  doc.moveDown();

  // Datos de la reserva
  doc.fontSize(12).text('Datos de la reserva', { underline: true });
  doc.fontSize(10).moveDown(0.5);
  doc.text(`Huésped: ${usuario?.username ?? reserva.huespedId}`);
  doc.text(`Habitación: N° ${habitacion?.numero ?? reserva.habitacionId}${habitacion ? ` (Piso ${habitacion.piso})` : ''}`);
  doc.text(`Check-in: ${reserva.fechaInicio}    Check-out: ${reserva.fechaFin}`);
  doc.moveDown();

  // Detalle de consumos
  const colConcepto = 50;
  const colCantidad = 280;
  const colPrecio = 350;
  const colSubtotal = 450;

  doc.fontSize(12).text('Detalle de consumos', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  const headerY = doc.y;
  doc.text('Concepto', colConcepto, headerY);
  doc.text('Cant.', colCantidad, headerY);
  doc.text('P. Unitario', colPrecio, headerY);
  doc.text('Subtotal', colSubtotal, headerY);
  doc.moveDown(0.5);
  doc.moveTo(colConcepto, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.5);

  let total = Number(reserva.montoTotal);

  const rowY1 = doc.y;
  doc.text(`Alojamiento (${reserva.fechaInicio} a ${reserva.fechaFin})`, colConcepto, rowY1);
  doc.text('1', colCantidad, rowY1);
  doc.text(Number(reserva.montoTotal).toFixed(2), colPrecio, rowY1);
  doc.text(Number(reserva.montoTotal).toFixed(2), colSubtotal, rowY1);
  doc.moveDown();

  for (const linea of servicios) {
    const nombreServicio = linea.cupo?.servicio?.nombre ?? `Servicio #${linea.cupoId}`;
    const montoLinea = Number(linea.montoTotal);
    total += montoLinea;

    const rowY = doc.y;
    doc.text(nombreServicio, colConcepto, rowY);
    doc.text(String(linea.cantidad), colCantidad, rowY);
    doc.text(Number(linea.precioUnitario).toFixed(2), colPrecio, rowY);
    doc.text(montoLinea.toFixed(2), colSubtotal, rowY);
    doc.moveDown();
  }

  doc.moveDown(0.5);
  doc.moveTo(colConcepto, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Total: $ ${total.toFixed(2)}`, { align: 'right' });

  doc.moveDown(2);
  doc.fontSize(10).text('Gracias por su estadía.', { align: 'center' });

  doc.end();
}
