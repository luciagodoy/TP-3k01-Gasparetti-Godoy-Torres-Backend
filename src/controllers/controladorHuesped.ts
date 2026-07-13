import { Request, Response } from 'express';
import { Transaction } from 'sequelize';
import sequelize from '../config/database';
import User from '../models/User';
import Huesped from '../models/Huesped'; 

// estructura exacta a recibir en el Body de la petición
interface RegistrarHuespedBody {
  username: string; // Agregado ya que el modelo User lo requiere como obligatorio (allowNull: false)
  email: string;
  password: string;
  telefono: string | null;
  documentoIdentidad: string;
  ciudad: string;
  provincia: string;
  pais?: string; // Opcional porque tiene un defaultValue: 'Argentina' en el modelo
}

// Tipamos el controlador inyectando la interfaz en el tercer parámetro genérico de Request
export const registrarHuesped = async (
  req: Request<{}, {}, RegistrarHuespedBody>, 
  res: Response
): Promise<void> => {
  // Inicializamos la variable de la transacción indicando su tipo explícito
  const t: Transaction = await sequelize.transaction();

  try {
    const { username, email, password, telefono, documentoIdentidad, ciudad, provincia, pais } = req.body;
    const nuevoUsuario = await User.create({
      username,
      email,
      password,
      role: 'huesped'
    }, { transaction: t });
    await Huesped.create({
      telefono,
      documentoIdentidad,
      ciudad,      
      provincia,  
      pais: pais || 'Argentina',        
      userId: nuevoUsuario.id
    }, { transaction: t });

    // impactamos la base de datos
    await t.commit();
    
    res.status(201).json({ mensaje: 'Huésped creado con éxito' });

  } catch (error: any) {
    await t.rollback();
    res.status(400).json({ 
      error: 'Error al registrar', 
      detalle: error.message 
    });
  }
};