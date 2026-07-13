import { Request, Response } from 'express';
import { Op, Transaction } from 'sequelize';
import sequelize from '../config/database';
import Reserva from '../models/Reserva';       
import Habitacion from '../models/Habitacion'; 

interface CrearReservaBody {
  fechaInicio: string;  
  fechaFin: string;   
  huespedId: number;
  habitacionId: number;
  montoTotal: number;
}

export const crearReserva = async (
  req: Request<{}, {}, CrearReservaBody>, 
  res: Response
): Promise<void | Response> => {
  const t: Transaction = await sequelize.transaction();

  try {
    const { fechaInicio, fechaFin, huespedId, habitacionId, montoTotal } = req.body;
    const reservaExistente = await Reserva.findOne({
      where: {
        habitacionId: habitacionId,
        estado: { [Op.ne]: 'cancelada' }, 
        [Op.or]: [
          {
            // Caso 1: La nueva reserva empieza dentro de una reserva existente
            fechaInicio: { [Op.between]: [fechaInicio, fechaFin] }
          },
          {
            // Caso 2: La nueva reserva termina dentro de una reserva existente
            fechaFin: { [Op.between]: [fechaInicio, fechaFin] }
          },
          {
            // Caso 3: La nueva reserva engloba completamente a una reserva existente
            [Op.and]: [
              { fechaInicio: { [Op.lte]: fechaInicio } },
              { fechaFin: { [Op.gte]: fechaFin } }
            ]
          }
        ]
      },
      transaction: t 
    });

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