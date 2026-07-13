import dotenv from 'dotenv';
dotenv.config(); // Nos aseguramos de leer las variables del archivo .env

import { Sequelize } from 'sequelize';

// Inicializamos la instancia de Sequelize con tipado seguro
const sequelize = new Sequelize(
  process.env.DB_NAME as string, 
  process.env.DB_USER as string, 
  process.env.DB_PASSWORD as string, 
  {
    host: process.env.DB_HOST,
    dialect: 'mysql', 
    logging: false, // Evita llenar la consola con comandos SQL crudos  
  }
);

export default sequelize;