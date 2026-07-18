import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

export const sequelize = new Sequelize(
  process.env.DB_NAME || 'DSW-hoteleria',    
  process.env.DB_USER || 'root',               
  process.env.DB_PASSWORD || '',                
  {
    host: process.env.DB_HOST || 'localhost',  
    dialect: 'mysql',                          
    logging: false                             
  }
);