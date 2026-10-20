import {Sequelize} from 'sequelize';
import dotenv from 'dotenv';
import fs from 'fs';
import mysql2 from 'mysql2';

dotenv.config();

const useSsl = process.env.DB_SSL === 'true';

// The CA certificate can come from two places:
//  - DB_CA_CERT: the PEM content itself. Needed in containers and on hosting
//    platforms, where certs/ does not exist (it is gitignored).
//  - DB_CA_PATH: a file path, convenient for local development.
const loadCaCertificate = (): string | Buffer | undefined => {
  if (process.env.DB_CA_CERT) {
    // Platforms usually store line breaks as a literal "\n" (backslash + n):
    // turn them back into real line breaks.
    return process.env.DB_CA_CERT.replace(/\\n/g, '\n');
  }
  if (process.env.DB_CA_PATH) {
    try {
      return fs.readFileSync(process.env.DB_CA_PATH);
    } catch {
      console.warn(`Could not read the CA certificate at ${process.env.DB_CA_PATH}.`);
    }
  }
  return undefined;
};

const ca = useSsl ? loadCaCertificate() : undefined;

// With a CA the server's certificate chain is verified; without one the
// connection is still encrypted but the server is not authenticated.
const sslOptions: Record<string, unknown> = {
  require: true,
  rejectUnauthorized: Boolean(ca),
  ...(ca ? {ca} : {})
};

if (useSsl && !ca) {
  console.warn(
    'WARNING: DB_SSL=true but there is no CA certificate (DB_CA_CERT or DB_CA_PATH). ' +
      'The connection is encrypted but the database server identity is NOT verified.'
  );
}

export const sequelize =
  process.env.NODE_ENV === 'test'
    ? new Sequelize({dialect: 'sqlite', storage: ':memory:', logging: false})
    : new Sequelize(process.env.DB_NAME || 'DSW-hoteleria', process.env.DB_USER || 'root', process.env.DB_PASSWORD || '', {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
        dialect: 'mysql',
        // Sequelize loads the driver with a dynamic require the Vercel bundler
        // cannot see; passing it explicitly avoids "Please install mysql2".
        dialectModule: mysql2,
        logging: false,
        dialectOptions: useSsl ? {ssl: sslOptions} : {}
      });
