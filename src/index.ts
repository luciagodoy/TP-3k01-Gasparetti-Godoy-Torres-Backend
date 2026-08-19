import dotenv from 'dotenv';
dotenv.config(); 

import { sequelize } from './config/database';
import app from './app';
import './models/index';
import User from './models/User';
import Huesped from './models/Huesped';
import CategoriaHabitacion from './models/categoriaHabitacion';
import Habitacion from './models/Habitacion';
import Reserva from './models/Reserva';
import Provincia from './models/Provincia';
import Ciudad from './models/Ciudad';
import Servicio from './models/Servicio';
import Cupo from './models/Cupo';
import PrecioServicio from './models/PrecioServicio';
import ReservaServicio from './models/ReservaServicio';
import Empleado from './models/Empleado';
import { seedAdmin } from './config/seedAdmin';

const PORT = process.env.PORT || 3000;

// === ARRANQUE DEL SERVIODR ===
async function iniciarServidor(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log(' Conexión a MySQL establecida con éxito (TS).');
    
    await sequelize.sync({ alter: true });
    console.log(' Tablas sincronizadas correctamente.');

    await seedAdmin();

    app.listen(PORT, () => {
      console.log(`Servidor TypeScript corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error crítico al conectar a la base de datos:', error);
  }
}

iniciarServidor();