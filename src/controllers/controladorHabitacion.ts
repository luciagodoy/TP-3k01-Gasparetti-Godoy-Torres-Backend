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

interface HabitacionBody {
  numero: number;
  piso: number;
  estadoDisponibilidad?: 'disponible' | 'ocupada' | 'mantenimiento';
  categoriaId: number;
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
    // Solo restringimos a "disponible" cuando se pide una búsqueda de disponibilidad por fechas;
    // un listado general (ej. panel de administración) debe ver habitaciones en todos los estados.
    const filtroHabitacion: WhereOptions = {};
    if (fechaInicio && fechaFin) {
      filtroHabitacion.estadoDisponibilidad = 'disponible';
    }

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

export const crearHabitacion = async (
  req: Request<{}, {}, HabitacionBody>,
  res: Response
): Promise<void> => {
  try {
    const { numero, piso, estadoDisponibilidad, categoriaId } = req.body;
    const habitacion = await Habitacion.create({
      numero,
      piso,
      estadoDisponibilidad: estadoDisponibilidad || 'disponible',
      categoriaId
    });
    res.status(201).json(habitacion);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al crear la habitación', detalle: error.message });
  }
};

export const obtenerHabitacion = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const habitacion = await Habitacion.findByPk(req.params.id, {
      include: [{ model: CategoriaHabitacion, as: 'categoria' }]
    });
    if (!habitacion) {
      res.status(404).json({ error: 'Habitación no encontrada' });
      return;
    }
    res.json(habitacion);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener la habitación', detalle: error.message });
  }
};

export const actualizarHabitacion = async (
  req: Request<{ id: string }, {}, Partial<HabitacionBody>>,
  res: Response
): Promise<void> => {
  try {
    const habitacion = await Habitacion.findByPk(req.params.id);
    if (!habitacion) {
      res.status(404).json({ error: 'Habitación no encontrada' });
      return;
    }
    const { numero, piso, estadoDisponibilidad, categoriaId } = req.body;
    await habitacion.update({
      ...(numero !== undefined && { numero }),
      ...(piso !== undefined && { piso }),
      ...(estadoDisponibilidad !== undefined && { estadoDisponibilidad }),
      ...(categoriaId !== undefined && { categoriaId })
    });
    res.json(habitacion);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al actualizar la habitación', detalle: error.message });
  }
};

export const eliminarHabitacion = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const habitacion = await Habitacion.findByPk(req.params.id);
    if (!habitacion) {
      res.status(404).json({ error: 'Habitación no encontrada' });
      return;
    }
    await habitacion.destroy();
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({
      error: 'Error al eliminar la habitación',
      detalle: 'Es posible que existan reservas asociadas a esta habitación.'
    });
  }
};