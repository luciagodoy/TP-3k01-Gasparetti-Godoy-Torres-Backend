import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import {sequelize} from './config/database';
import {getJwtSecret} from './config/jwt';
import {seedAdmin} from './config/seed-admin';

const PORT = process.env.PORT || 3000;

async function startServer(): Promise<void> {
  try {
    // Fallar al arrancar, y no en el primer login, si falta JWT_SECRET.
    getJwtSecret();

    await sequelize.authenticate();
    console.log('Connected to MySQL.');

    // sync({ alter: true }) compara las entidades con las tablas y ejecuta
    // ALTER TABLE sobre la marcha. Cómodo en desarrollo; contra la base de
    // producción es un cambio de esquema sin revisar y sin vuelta atrás. En
    // producción sólo corre cuando se pide explícitamente con DB_SYNC=alter.
    const syncSchema = process.env.NODE_ENV !== 'production' || process.env.DB_SYNC === 'alter';
    if (syncSchema) {
      await sequelize.sync({alter: true});
      console.log('Schema synchronized.');
    } else {
      console.log('Schema sync skipped (production without DB_SYNC=alter).');
    }

    await seedAdmin();
    const server = app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
    server.on('error', (error) => {
      console.error(`Could not listen on port ${PORT}:`, error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Fatal error while starting the server:', error);
    process.exit(1);
  }
}

startServer();
