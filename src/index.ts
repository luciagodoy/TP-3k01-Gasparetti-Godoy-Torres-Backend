import dotenv from 'dotenv';
dotenv.config();

import {sequelize} from './config/database';
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
import {seedAdmin} from './config/seedAdmin';
import {getJwtSecret} from './config/jwt';

const PORT = process.env.PORT || 3000;

// === ARRANQUE DEL SERVIODR ===
async function iniciarServidor(): Promise<void> {
  try {
    // Chequeo de configuración antes de escuchar
    getJwtSecret();

    await sequelize.authenticate();
    console.log(' Conexión a MySQL establecida con éxito (TS).');

    // sync({ alter: true }) compara los modelos con las tablas y emite ALTER
    // TABLE en caliente. En desarrollo es cómodo; contra la base de producción
    // es un cambio de esquema sin revisión previa y sin forma de volver atrás.
    // En producción sólo corre con DB_SYNC=alter .
    const sincronizarEsquema =
      process.env.NODE_ENV !== 'production' || process.env.DB_SYNC === 'alter';

    if (sincronizarEsquema) {
      await sequelize.sync({alter: true});
      console.log(' Tablas sincronizadas correctamente.');
    } else {
      console.log(' Sincronización de esquema omitida (producción sin DB_SYNC=alter).');
    }
    await seedAdmin();
    const server = app.listen(PORT, () => {
      console.log(`Servidor TypeScript corriendo en http://localhost:${PORT}`);
    });

    server.on('error', (error) => {
      console.error(`No se pudo escuchar en el puerto ${PORT}:`, error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Error crítico durante el arranque del servidor:', error);
    process.exit(1);
  }
}

iniciarServidor();
