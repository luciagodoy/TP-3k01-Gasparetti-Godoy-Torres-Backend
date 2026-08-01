import dotenv from 'dotenv';
dotenv.config(); 

import express, { Request, Response } from 'express';
import cors from 'cors';
import { sequelize } from './config/database';
import masterRouter from './routes';
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

const app = express();
const PORT = process.env.PORT || 3000;

// === MIDDLEWARES ===
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === ENRUTAMIENTO ===
app.use('/api', masterRouter);


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