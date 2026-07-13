const { Op } = require('sequelize');
const Habitacion = require('../models/Habitacion');
const CategoriaHabitacion = require('../models/CategoriaHabitacion');
const Reserva = require('../models/Reserva');

exports.listarHabitacionesFiltradas = async (req, res) => {
  try {
    // Capturamos los filtros que vienen desde el Frontend por la URL (Query Params)
    // Ejemplo: /api/habitaciones?fechaInicio=2026-10-01&fechaFin=2026-10-05&categoriaId=2&personas=3
    const { fechaInicio, fechaFin, categoriaId, personas } = req.query;

    // 1. CONDICIONES PARA LA CATEGORÍA
    let filtroCategoria = {};
    if (categoriaId) filtroCategoria.id = categoriaId;
    if (personas) filtroCategoria.capacidadPersonas = { [Op.gte]: personas }; // Capacidad mayor o igual

    // 2. LÓGICA DE DISPONIBILIDAD ENTRE FECHAS
    let habitacionesOcupadasIds = [];

    if (fechaInicio && fechaFin) {
      // Buscamos todas las reservas activas que se solapan con el rango de fechas pedido
      const reservasSolapadas = await Reserva.findAll({
        where: {
          estado: { [Op.ne]: 'cancelada' }, // Ignoramos reservas canceladas
          [Op.or]: [
            { fechaInicio: { [Op.between]: [fechaInicio, fechaFin] } },
            { fechaFin: { [Op.between]: [fechaInicio, fechaFin] } },
            {
              [Op.and]: [
                { fechaInicio: { [Op.lte]: fechaInicio } },
                { fechaFin: { [Op.gte]: fechaFin } }
              ]
            }
          ]
        },
        attributes: ['habitacionId'] // Solo nos interesan los IDs de las habitaciones ocupadas
      });

      // Extraemos los IDs en un arreglo plano: [1, 4, 7...]
      habitacionesOcupadasIds = reservasSolapadas.map(r => r.habitacionId);
    }

    // 3. CONDICIONES PARA LA HABITACIÓN
    let filtroHabitacion = {
      estadoDisponibilidad: 'disponible' // Que no esté en mantenimiento
    };

    // Si encontramos habitaciones ocupadas, las EXCLUIMOS de la búsqueda final
    if (habitacionesOcupadasIds.length > 0) {
      filtroHabitacion.id = { [Op.notIn]: habitacionesOcupadasIds };
    }

    // 4. CONSULTA FINAL CON INNER JOIN
    const habitacionesDisponibles = await Habitacion.findAll({
      where: filtroHabitacion,
      include: [{
        model: CategoriaHabitacion,
        as: 'categoria',
        where: filtroCategoria, // Aplica los filtros de capacidad o tipo
        required: true // Hace que sea un INNER JOIN (obliga a que tenga categoría)
      }]
    });

    res.json(habitacionesDisponibles);

  } catch (error) {
    res.status(500).json({ 
      error: 'Error al filtrar las habitaciones', 
      detalle: error.message 
    });
  }
};