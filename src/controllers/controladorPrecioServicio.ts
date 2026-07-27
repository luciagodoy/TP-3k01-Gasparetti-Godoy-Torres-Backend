import { Request, Response } from 'express';
import PrecioServicio from '../models/PrecioServicio';
import Servicio from '../models/Servicio';

interface PrecioServicioBody {
  precio: number;
  fechaVigenciaDesde: string;
  fechaVigenciaHasta?: string | null;
  servicioId: number;
}

interface ListarPreciosQuery {
  servicioId?: string;
}

export const crearPrecioServicio = async (
  req: Request<{}, {}, PrecioServicioBody>,
  res: Response
): Promise<void> => {
  try {
    const { precio, fechaVigenciaDesde, fechaVigenciaHasta, servicioId } = req.body;
    const precioServicio = await PrecioServicio.create({
      precio,
      fechaVigenciaDesde,
      fechaVigenciaHasta: fechaVigenciaHasta ?? null,
      servicioId
    });
    res.status(201).json(precioServicio);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al crear el precio del servicio', detalle: error.message });
  }
};

export const listarPreciosServicio = async (
  req: Request<{}, {}, {}, ListarPreciosQuery>,
  res: Response
): Promise<void> => {
  try {
    const { servicioId } = req.query;
    const where = servicioId ? { servicioId: parseInt(servicioId, 10) } : undefined;
    const precios = await PrecioServicio.findAll({
      where,
      include: [{ model: Servicio, as: 'servicio' }]
    });
    res.json(precios);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar los precios de servicio', detalle: error.message });
  }
};

export const obtenerPrecioServicio = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const precioServicio = await PrecioServicio.findByPk(req.params.id, {
      include: [{ model: Servicio, as: 'servicio' }]
    });
    if (!precioServicio) {
      res.status(404).json({ error: 'Precio de servicio no encontrado' });
      return;
    }
    res.json(precioServicio);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener el precio del servicio', detalle: error.message });
  }
};

export const actualizarPrecioServicio = async (
  req: Request<{ id: string }, {}, Partial<PrecioServicioBody>>,
  res: Response
): Promise<void> => {
  try {
    const precioServicio = await PrecioServicio.findByPk(req.params.id);
    if (!precioServicio) {
      res.status(404).json({ error: 'Precio de servicio no encontrado' });
      return;
    }
    const { precio, fechaVigenciaDesde, fechaVigenciaHasta, servicioId } = req.body;
    await precioServicio.update({
      ...(precio !== undefined && { precio }),
      ...(fechaVigenciaDesde !== undefined && { fechaVigenciaDesde }),
      ...(fechaVigenciaHasta !== undefined && { fechaVigenciaHasta }),
      ...(servicioId !== undefined && { servicioId })
    });
    res.json(precioServicio);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al actualizar el precio del servicio', detalle: error.message });
  }
};

export const eliminarPrecioServicio = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const precioServicio = await PrecioServicio.findByPk(req.params.id);
    if (!precioServicio) {
      res.status(404).json({ error: 'Precio de servicio no encontrado' });
      return;
    }
    await precioServicio.destroy();
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: 'Error al eliminar el precio del servicio', detalle: error.message });
  }
};
