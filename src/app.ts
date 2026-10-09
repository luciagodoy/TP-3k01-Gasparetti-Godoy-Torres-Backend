import express, {Request, Response} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import masterRouter from './routes';
import healthRouter from './routes/healthRoutes';
import {apiLimiter} from './middleware/rateLimit';
// Las asociaciones Categoría <-> Habitación viven en models/index. Se importan
// acá y no sólo en index.ts porque en Vercel el punto de entrada es este
// archivo: index.ts (y su app.listen) no se ejecuta nunca.
import './models/index';

const app = express();

// Detrás de un proxy inverso (nginx, Render, Railway...) req.ip es la IP del
// proxy, así que el rate limit metería a todos los usuarios en el mismo balde.
// Se activa por variable de entorno a propósito: habilitarlo sin un proxy real
// delante permite falsear X-Forwarded-For y saltear el límite rotando la clave.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
}

// Cabeceras de seguridad estándar (X-Content-Type-Options, Referrer-Policy,
// X-Frame-Options, etc.). crossOriginResourcePolicy se relaja porque el front
// corre en otro origen y consume esta API.
app.use(helmet({crossOriginResourcePolicy: {policy: 'cross-origin'}}));

app.use(cors({origin: process.env.FRONTEND_URL || 'http://localhost:5173'}));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Fuera del rate limit a propósito: la plataforma consulta /health cada pocos
// segundos, y si un pico de tráfico agotara la cuota, el chequeo recibiría 429,
// la plataforma lo tomaría como caída y reiniciaría un contenedor sano.
app.use('/health', healthRouter);

app.use('/api', apiLimiter, masterRouter);

app.get('/', (req: Request, res: Response) => {
  res.send('¡Servidor Express + TypeScript + Sequelize funcionando!');
});

export default app;
