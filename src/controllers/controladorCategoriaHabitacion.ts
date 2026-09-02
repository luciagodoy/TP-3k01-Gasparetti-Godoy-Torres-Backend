import { Request, Response } from 'express';
import CategoriaHabitacion from '../models/categoriaHabitacion';
import { detalleError } from '../utils/errorDetalle';

interface CategoriaHabitacionBody {
  denominacion: string;
  descripcion?: string | null;
  capacidadPersonas: number;
  imagenesUrl?: string[];
  precioNoche?: number;
}

export const crearCategoria = async (
  req: Request<{}, {}, CategoriaHabitacionBody>,
  res: Response
): Promise<void> => {
  try {
    const { denominacion, descripcion, capacidadPersonas, imagenesUrl, precioNoche } = req.body;
    const categoria = await CategoriaHabitacion.create({
      denominacion,
      descripcion: descripcion ?? null,
      capacidadPersonas,
      imagenesUrl: imagenesUrl ?? [],
      precioNoche: precioNoche ?? 0
    });
    res.status(201).json(categoria);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al crear la categoría', detalle: detalleError(error) });
  }
};

export const listarCategorias = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categorias = await CategoriaHabitacion.findAll();
    res.json(categorias);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar las categorías', detalle: detalleError(error) });
  }
};

export const obtenerCategoria = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const categoria = await CategoriaHabitacion.findByPk(req.params.id);
    if (!categoria) {
      res.status(404).json({ error: 'Categoría no encontrada' });
      return;
    }
    res.json(categoria);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener la categoría', detalle: detalleError(error) });
  }
};

export const actualizarCategoria = async (
  req: Request<{ id: string }, {}, Partial<CategoriaHabitacionBody>>,
  res: Response
): Promise<void> => {
  try {
    const categoria = await CategoriaHabitacion.findByPk(req.params.id);
    if (!categoria) {
      res.status(404).json({ error: 'Categoría no encontrada' });
      return;
    }
    const { denominacion, descripcion, capacidadPersonas, imagenesUrl, precioNoche } = req.body;
    await categoria.update({
      ...(denominacion !== undefined && { denominacion }),
      ...(descripcion !== undefined && { descripcion }),
      ...(capacidadPersonas !== undefined && { capacidadPersonas }),
      ...(imagenesUrl !== undefined && { imagenesUrl }),
      ...(precioNoche !== undefined && { precioNoche })
    });
    res.json(categoria);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al actualizar la categoría', detalle: detalleError(error) });
  }
};

export const eliminarCategoria = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const categoria = await CategoriaHabitacion.findByPk(req.params.id);
    if (!categoria) {
      res.status(404).json({ error: 'Categoría no encontrada' });
      return;
    }
    await categoria.destroy();
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({
      error: 'Error al eliminar la categoría',
      detalle: 'Es posible que existan habitaciones asociadas a esta categoría.'
    });
  }
};
