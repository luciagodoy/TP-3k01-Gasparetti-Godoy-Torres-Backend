import { Request, Response } from 'express';
import Cupo from '../models/Cupo';
import Servicio from '../models/Servicio';
import { detalleError } from '../utils/errorDetalle';

// disponibles NUNCA se acepta del cliente: lo gestiona el servidor para mantener el invariante
// 0 <= disponibles <= cantidad (ver también controladorReservaServicio.ts, que lo decrementa/incrementa).
interface CrearCupoBody {
  cantidad: number;
  servicioId: number;
}

interface ActualizarCupoBody {
  cantidad?: number;
  servicioId?: number;
}

interface ListarCuposQuery {
  servicioId?: string;
}

export const crearCupo = async (
  req: Request<{}, {}, CrearCupoBody>,
  res: Response
): Promise<void> => {
  try {
    const { cantidad, servicioId } = req.body;
    const cupo = await Cupo.create({ cantidad, disponibles: cantidad, servicioId });
    res.status(201).json(cupo);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al crear el cupo', detalle: detalleError(error) });
  }
};

export const listarCupos = async (
  req: Request<{}, {}, {}, ListarCuposQuery>,
  res: Response
): Promise<void> => {
  try {
    const { servicioId } = req.query;
    const where = servicioId ? { servicioId: parseInt(servicioId, 10) } : undefined;
    const cupos = await Cupo.findAll({
      where,
      include: [{ model: Servicio, as: 'servicio' }]
    });
    res.json(cupos);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar los cupos', detalle: detalleError(error) });
  }
};

export const obtenerCupo = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const cupo = await Cupo.findByPk(req.params.id, {
      include: [{ model: Servicio, as: 'servicio' }]
    });
    if (!cupo) {
      res.status(404).json({ error: 'Cupo no encontrado' });
      return;
    }
    res.json(cupo);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener el cupo', detalle: detalleError(error) });
  }
};

export const actualizarCupo = async (
  req: Request<{ id: string }, {}, ActualizarCupoBody>,
  res: Response
): Promise<void> => {
  try {
    const cupo = await Cupo.findByPk(req.params.id);
    if (!cupo) {
      res.status(404).json({ error: 'Cupo no encontrado' });
      return;
    }
    const { cantidad, servicioId } = req.body;

    let nuevosDisponibles = cupo.disponibles;
    let nuevaCantidad = cupo.cantidad;
    if (cantidad !== undefined) {
      const delta = cantidad - cupo.cantidad;
      nuevosDisponibles = cupo.disponibles + delta;
      nuevaCantidad = cantidad;
      if (nuevosDisponibles < 0 || nuevosDisponibles > nuevaCantidad) {
        res.status(400).json({
          error: 'Cantidad inválida',
          mensaje: 'No se puede reducir la cantidad por debajo de lo ya consumido.'
        });
        return;
      }
    }

    await cupo.update({
      ...(cantidad !== undefined && { cantidad: nuevaCantidad, disponibles: nuevosDisponibles }),
      ...(servicioId !== undefined && { servicioId })
    });
    res.json(cupo);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al actualizar el cupo', detalle: detalleError(error) });
  }
};

export const eliminarCupo = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const cupo = await Cupo.findByPk(req.params.id);
    if (!cupo) {
      res.status(404).json({ error: 'Cupo no encontrado' });
      return;
    }
    await cupo.destroy();
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({
      error: 'Error al eliminar el cupo',
      detalle: 'Es posible que existan consumos de reserva asociados a este cupo.'
    });
  }
};
