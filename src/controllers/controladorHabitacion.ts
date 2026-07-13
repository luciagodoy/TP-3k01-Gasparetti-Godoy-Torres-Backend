import { Request, Response } from 'express';
import { Op, WhereOptions } from 'sequelize';
import Habitacion from '../models/Habitacion';
import CategoriaHabitacion from '../models/categoriaHabitacion';
import Reserva from '../models/Reserva';

// Definir la estructura estricta de la URL (Query Params)
interface BuscarHabitacionQuery {
  fechaInicio?: string;
  fechaFin?: string;
  categoriaId?: string;
  personas?: string;
}

export const listarHabitacionesFiltradas = async (
  req: Request<{}, {}, {}, BuscarHabitacionQuery>, 
  res: Response
): Promise<void> => {
  try {
    const { fechaInicio, fechaFin, categoriaId, personas } = req.query;
    const filtroCategoria: WhereOptions = {};
    
    if (categoriaId) {
      filtroCategoria.id = parseInt(categoriaId, 10);
    }
    
    if (personas) {
      filtroCategoria.capacidadPersonas = { [Op.gte]: parseInt(personas, 10) };
    }

    // LÓGICA DE DISPONIBILIDAD ENTRE FECHAS
    let habitacionesOcupadasIds: number[] = [];

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
        attributes: ['habitacionId']
      });

      // Extraemos los IDs
      habitacionesOcupadasIds = reservasSolapadas.map(r => r.habitacionId);
    }

    // 3. CONDICIONES PARA LA HABITACIÓN
    const filtroHabitacion: WhereOptions = {
      estadoDisponibilidad: 'disponible' 
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
        where: filtroCategoria, 
        required: true          // Hace que sea un INNER JOIN obligado
      }]
    });

    res.json(habitacionesDisponibles);

  } catch (error: any) {
    res.status(500).json({ 
      error: 'Error al filtrar las habitaciones', 
      detalle: error.message 
    });
  }
};