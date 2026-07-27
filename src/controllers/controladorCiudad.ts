import { Request, Response } from 'express';
import Ciudad from '../models/Ciudad';
import Provincia from '../models/Provincia';

interface CiudadBody {
  nombre: string;
  provinciaId: number;
}

interface ListarCiudadesQuery {
  provinciaId?: string;
}

export const crearCiudad = async (
  req: Request<{}, {}, CiudadBody>,
  res: Response
): Promise<void> => {
  try {
    const { nombre, provinciaId } = req.body;
    const ciudad = await Ciudad.create({ nombre, provinciaId });
    res.status(201).json(ciudad);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al crear la ciudad', detalle: error.message });
  }
};

export const listarCiudades = async (
  req: Request<{}, {}, {}, ListarCiudadesQuery>,
  res: Response
): Promise<void> => {
  try {
    const { provinciaId } = req.query;
    const where = provinciaId ? { provinciaId: parseInt(provinciaId, 10) } : undefined;
    const ciudades = await Ciudad.findAll({
      where,
      include: [{ model: Provincia, as: 'provincia' }]
    });
    res.json(ciudades);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar las ciudades', detalle: error.message });
  }
};

export const obtenerCiudad = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const ciudad = await Ciudad.findByPk(req.params.id, {
      include: [{ model: Provincia, as: 'provincia' }]
    });
    if (!ciudad) {
      res.status(404).json({ error: 'Ciudad no encontrada' });
      return;
    }
    res.json(ciudad);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener la ciudad', detalle: error.message });
  }
};

export const actualizarCiudad = async (
  req: Request<{ id: string }, {}, Partial<CiudadBody>>,
  res: Response
): Promise<void> => {
  try {
    const ciudad = await Ciudad.findByPk(req.params.id);
    if (!ciudad) {
      res.status(404).json({ error: 'Ciudad no encontrada' });
      return;
    }
    const { nombre, provinciaId } = req.body;
    await ciudad.update({
      ...(nombre !== undefined && { nombre }),
      ...(provinciaId !== undefined && { provinciaId })
    });
    res.json(ciudad);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al actualizar la ciudad', detalle: error.message });
  }
};

export const eliminarCiudad = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const ciudad = await Ciudad.findByPk(req.params.id);
    if (!ciudad) {
      res.status(404).json({ error: 'Ciudad no encontrada' });
      return;
    }
    await ciudad.destroy();
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({
      error: 'Error al eliminar la ciudad',
      detalle: 'Es posible que existan huéspedes asociados a esta ciudad.'
    });
  }
};
