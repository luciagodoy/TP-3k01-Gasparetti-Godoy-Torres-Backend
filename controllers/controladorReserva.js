const { Op } = require('sequelize');
const Reserva = require('../models/Reserva');
const Habitacion = require('../models/Habitacion');
const sequelize = require('../config/database');

exports.crearReserva = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { fechaInicio, fechaFin, huespedId, habitacionId, montoTotal } = req.body;

    // 1. VALIDACIÓN CRÍTICA:
    const reservaExistente = await Reserva.findOne({
      where: {
        habitacionId: habitacionId,
        estado: { [Op.ne]: 'cancelada' }, // Ignorar las reservas canceladas
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
      }
    });

    if (reservaExistente) {
      return res.status(400).json({ 
        error: 'Habitación no disponible', 
        mensaje: 'La habitación ya se encuentra reservada para las fechas seleccionadas.' 
      });
    }

    //  crear la reserva
    const nuevaReserva = await Reserva.create({
      fechaInicio,
      fechaFin,
      huespedId,
      habitacionId,
      montoTotal,
      estado: 'pendiente'
    }, { transaction: t });

    //  cambios en MySQL
    await t.commit();

    res.status(201).json({
      mensaje: '¡Reserva realizada con éxito!',
      reserva: nuevaReserva
    });

  } catch (error) {
    //  cancelar la operación en la base de datos
    await t.rollback();
    res.status(500).json({ error: 'Error al procesar la reserva', detalle: error.message });
  }
};