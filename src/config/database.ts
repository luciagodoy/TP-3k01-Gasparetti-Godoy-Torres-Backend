import {Sequelize} from 'sequelize';
import dotenv from 'dotenv';
import fs from 'fs';
import mysql2 from 'mysql2';

dotenv.config();

const useSsl = process.env.DB_SSL === 'true';

// El CA puede venir de dos lados:
//  - DB_CA_CERT: el contenido PEM directo. Es lo que sirve en un contenedor o
//    en una plataforma (Render, Railway...), donde certs/ no existe porque está
//    en .gitignore y por lo tanto nunca llega a la imagen.
//  - DB_CA_PATH: una ruta a archivo, cómodo para desarrollo local.
const cargarCA = (): string | Buffer | undefined => {
  if (process.env.DB_CA_CERT) {
    // Las plataformas suelen guardar los saltos de línea como "\n" literal
    // (barra + n): el regex /\\n/ los busca y los vuelve saltos reales.
    return process.env.DB_CA_CERT.replace(/\\n/g, '\n');
  }
  if (process.env.DB_CA_PATH) {
    try {
      return fs.readFileSync(process.env.DB_CA_PATH);
    } catch {
      console.warn(`No se pudo leer el certificado CA en ${process.env.DB_CA_PATH}.`);
    }
  }
  return undefined;
};

const ca = useSsl ? cargarCA() : undefined;

// Antes rejectUnauthorized era siempre false: el CA se cargaba pero nunca se
// usaba, porque con false no se valida la cadena de certificados. La conexión
// iba cifrada pero sin autenticar al servidor, así que cualquiera en el medio
// podía presentar su propio certificado. Ahora, si hay CA, se valida.
const sslOptions: Record<string, unknown> = {
  require: true,
  rejectUnauthorized: Boolean(ca),
  ...(ca ? {ca} : {})
};

if (useSsl && !ca) {
  console.warn(
    'ADVERTENCIA: DB_SSL=true pero no hay certificado CA (DB_CA_CERT o DB_CA_PATH). ' +
      'La conexión va cifrada pero SIN verificar la identidad del servidor de base de datos.'
  );
}

export const sequelize =
  process.env.NODE_ENV === 'test'
    ? new Sequelize({dialect: 'sqlite', storage: ':memory:', logging: false})
    : new Sequelize(process.env.DB_NAME || 'DSW-hoteleria', process.env.DB_USER || 'root', process.env.DB_PASSWORD || '', {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
        dialect: 'mysql',
        // Sequelize carga el driver con un require dinámico que el bundler de
        // Vercel no detecta; pasarlo explícito evita "Please install mysql2".
        dialectModule: mysql2,
        logging: false,
        dialectOptions: useSsl
          ? {
              ssl: sslOptions
            }
          : {}
      });
