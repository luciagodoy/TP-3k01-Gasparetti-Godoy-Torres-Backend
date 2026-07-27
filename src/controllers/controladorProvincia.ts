import { Request, Response } from 'express';
import Provincia from '../models/Provincia';

interface ProvinciaBody {
  nombre: string;
}

export const crearProvincia = async (
  req: Request<{}, {}, ProvinciaBody>,
  res: Response
): Promise<void> => {
  try {
    const { nombre } = req.body;
    const provincia = await Provincia.create({ nombre });
    res.status(201).json(provincia);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al crear la provincia', detalle: error.message });
  }
};

export const listarProvincias = async (_req: Request, res: Response): Promise<void> => {
  try {
    const provincias = await Provincia.findAll();
    res.json(provincias);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar las provincias', detalle: error.message });
  }
};

export const obtenerProvincia = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const provincia = await Provincia.findByPk(req.params.id);
    if (!provincia) {
      res.status(404).json({ error: 'Provincia no encontrada' });
      return;
    }
    res.json(provincia);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener la provincia', detalle: error.message });
  }
};

export const actualizarProvincia = async (
  req: Request<{ id: string }, {}, Partial<ProvinciaBody>>,
  res: Response
): Promise<void> => {
  try {
    const provincia = await Provincia.findByPk(req.params.id);
    if (!provincia) {
      res.status(404).json({ error: 'Provincia no encontrada' });
      return;
    }
    const { nombre } = req.body;
    await provincia.update({ ...(nombre !== undefined && { nombre }) });
    res.json(provincia);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al actualizar la provincia', detalle: error.message });
  }
};

export const eliminarProvincia = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const provincia = await Provincia.findByPk(req.params.id);
    if (!provincia) {
      res.status(404).json({ error: 'Provincia no encontrada' });
      return;
    }
    await provincia.destroy();
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({
      error: 'Error al eliminar la provincia',
      detalle: 'Es posible que existan ciudades asociadas a esta provincia.'
    });
  }
};
