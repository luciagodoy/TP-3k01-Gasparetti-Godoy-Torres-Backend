import dotenv from 'dotenv';
dotenv.config(); 

import express, { Request, Response } from 'express';
import sequelize from './config/database'; 

// === IMPORTACIÓN DE MODELOS ===
import User from './models/User';
import Huesped from './models/Huesped';
import CategoriaHabitacion from './models/categoriaHabitacion';
import Habitacion from './models/Habitacion';
import Reserva from './models/Reserva';

// === IMPORTACIÓN DE RUTAS ===
import reservaRoutes from './routes/reservaRoutes';
import habitacionRoutes from './routes/habitacionRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

// === MIDDLEWARES ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === ENRUTAMIENTO ===
app.use('/api/reservas', reservaRoutes);
app.use('/api/habitaciones', habitacionRoutes);


app.get('/', (req: Request, res: Response) => {
  res.send('¡Servidor Express + TypeScript + Sequelize funcionando!');
});

// === ARRANQUE DEL SERVIODR ===
async function iniciarServidor(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log(' Conexión a MySQL establecida con éxito (TS).');
    
    await sequelize.sync({ alter: true });
    console.log(' Tablas sincronizadas correctamente.');
    
    app.listen(PORT, () => {
      console.log(`Servidor TypeScript corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error crítico al conectar a la base de datos:', error);
  }
}

iniciarServidor();