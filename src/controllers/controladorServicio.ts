import { Request, Response } from 'express';
import Servicio from '../models/Servicio';

interface ServicioBody {
  nombre: string;
  descripcion?: string | null;
}

export const crearServicio = async (
  req: Request<{}, {}, ServicioBody>,
  res: Response
): Promise<void> => {
  try {
    const { nombre, descripcion } = req.body;
    const servicio = await Servicio.create({ nombre, descripcion: descripcion ?? null });
    res.status(201).json(servicio);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al crear el servicio', detalle: error.message });
  }
};

export const listarServicios = async (_req: Request, res: Response): Promise<void> => {
  try {
    const servicios = await Servicio.findAll();
    res.json(servicios);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar los servicios', detalle: error.message });
  }
};

export const obtenerServicio = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const servicio = await Servicio.findByPk(req.params.id);
    if (!servicio) {
      res.status(404).json({ error: 'Servicio no encontrado' });
      return;
    }
    res.json(servicio);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener el servicio', detalle: error.message });
  }
};

export const actualizarServicio = async (
  req: Request<{ id: string }, {}, Partial<ServicioBody>>,
  res: Response
): Promise<void> => {
  try {
    const servicio = await Servicio.findByPk(req.params.id);
    if (!servicio) {
      res.status(404).json({ error: 'Servicio no encontrado' });
      return;
    }
    const { nombre, descripcion } = req.body;
    await servicio.update({
      ...(nombre !== undefined && { nombre }),
      ...(descripcion !== undefined && { descripcion })
    });
    res.json(servicio);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al actualizar el servicio', detalle: error.message });
  }
};

export const eliminarServicio = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const servicio = await Servicio.findByPk(req.params.id);
    if (!servicio) {
      res.status(404).json({ error: 'Servicio no encontrado' });
      return;
    }
    await servicio.destroy();
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({
      error: 'Error al eliminar el servicio',
      detalle: 'Es posible que existan cupos o precios asociados a este servicio.'
    });
  }
};
