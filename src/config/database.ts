import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const useSsl = process.env.DB_SSL === 'true';

const sslOptions: Record<string, unknown> = {
  require: true,
  rejectUnauthorized: false
};

if (useSsl && process.env.DB_CA_PATH) {
  try {
    sslOptions.ca = fs.readFileSync(process.env.DB_CA_PATH);
  } catch (error) {
    console.warn(`No se pudo cargar el certificado SSL en ${process.env.DB_CA_PATH}. Se usará SSL sin validación del CA.`);
  }
}

export const sequelize = process.env.NODE_ENV === 'test'
  ? new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false })
  : new Sequelize(
    process.env.DB_NAME || 'DSW-hoteleria',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      dialect: 'mysql',
      logging: false,
      dialectOptions: useSsl
        ? {
            ssl: sslOptions
          }
        : {}
    }
  );
