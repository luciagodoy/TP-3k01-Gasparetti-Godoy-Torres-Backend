import { Request, Response } from 'express';
import Empleado from '../models/Empleado';

interface EmpleadoBody {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string | null;
  puesto: string;
  estado?: 'activo' | 'inactivo';
}

export const crearEmpleado = async (
  req: Request<{}, {}, EmpleadoBody>,
  res: Response
): Promise<void> => {
  try {
    const { nombre, apellido, email, telefono, puesto, estado } = req.body;
    const empleado = await Empleado.create({
      nombre,
      apellido,
      email,
      telefono: telefono ?? null,
      puesto,
      estado: estado || 'activo'
    });
    res.status(201).json(empleado);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al crear el empleado', detalle: error.message });
  }
};

export const listarEmpleados = async (_req: Request, res: Response): Promise<void> => {
  try {
    const empleados = await Empleado.findAll();
    res.json(empleados);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar los empleados', detalle: error.message });
  }
};

export const obtenerEmpleado = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const empleado = await Empleado.findByPk(req.params.id);
    if (!empleado) {
      res.status(404).json({ error: 'Empleado no encontrado' });
      return;
    }
    res.json(empleado);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener el empleado', detalle: error.message });
  }
};

export const actualizarEmpleado = async (
  req: Request<{ id: string }, {}, Partial<EmpleadoBody>>,
  res: Response
): Promise<void> => {
  try {
    const empleado = await Empleado.findByPk(req.params.id);
    if (!empleado) {
      res.status(404).json({ error: 'Empleado no encontrado' });
      return;
    }
    const { nombre, apellido, email, telefono, puesto, estado } = req.body;
    await empleado.update({
      ...(nombre !== undefined && { nombre }),
      ...(apellido !== undefined && { apellido }),
      ...(email !== undefined && { email }),
      ...(telefono !== undefined && { telefono }),
      ...(puesto !== undefined && { puesto }),
      ...(estado !== undefined && { estado })
    });
    res.json(empleado);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al actualizar el empleado', detalle: error.message });
  }
};

export const eliminarEmpleado = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const empleado = await Empleado.findByPk(req.params.id);
    if (!empleado) {
      res.status(404).json({ error: 'Empleado no encontrado' });
      return;
    }
    await empleado.destroy();
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: 'Error al eliminar el empleado', detalle: error.message });
  }
};
