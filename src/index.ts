import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import {sequelize} from './config/database';
import {getJwtSecret} from './config/jwt';
import {seedAdmin} from './config/seed-admin';

const PORT = process.env.PORT || 3000;

async function startServer(): Promise<void> {
  try {
    // Fail at startup, not on the first login, if JWT_SECRET is missing.
    getJwtSecret();

    await sequelize.authenticate();
    console.log('Connected to MySQL.');

    // sync({ alter: true }) diffs the entities against the tables and runs
    // ALTER TABLE on the fly. Handy in development; against the production
    // database it is an unreviewed schema change with no way back. In
    // production it only runs when explicitly requested with DB_SYNC=alter.
    const syncSchema = process.env.NODE_ENV !== 'production' || process.env.DB_SYNC === 'alter';
    if (syncSchema) {
      await sequelize.sync({alter: true});
      console.log('Schema synchronized.');
    } else {
      console.log('Schema sync skipped (production without DB_SYNC=alter).');
    }

    await seedAdmin();

    // listen errors (e.g. EADDRINUSE) arrive asynchronously and the try/catch
    // does not see them: without this handler the process looked "started"
    // in the logs while nothing was listening.
    const server = app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
    server.on('error', (error) => {
      console.error(`Could not listen on port ${PORT}:`, error);
      process.exit(1);
    });
  } catch (error) {
    // A failed startup must not leave the process alive but useless.
    console.error('Fatal error while starting the server:', error);
    process.exit(1);
  }
}

startServer();
