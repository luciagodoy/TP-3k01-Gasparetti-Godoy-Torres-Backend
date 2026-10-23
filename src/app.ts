import express, {Request, Response} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import './entities';
import apiRouter from './routes';
import healthRouter from './routes/health.routes';
import {apiLimiter} from './middleware/rate-limit';
import {errorHandler, notFoundHandler} from './middleware/error-handler';

const app = express();
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
}

// Headers de seguridad estándar (X-Content-Type-Options, Referrer-Policy,
// X-Frame-Options...). crossOriginResourcePolicy se relaja porque el
// frontend corre en otro origen y consume esta API.
app.use(helmet({crossOriginResourcePolicy: {policy: 'cross-origin'}}));
app.use(cors({origin: process.env.FRONTEND_URL || 'http://localhost:5173'}));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use((req, _res, next) => {
  req.body ??= {};
  next();
});

// Fuera del rate limit a propósito: la plataforma consulta /health cada pocos
// segundos, y si un pico de tráfico agotara la cuota el chequeo recibiría un 429,
// se leería como una caída y se reiniciaría un contenedor sano.
app.use('/health', healthRouter);
app.use('/api', apiLimiter, apiRouter);

app.get('/', (_req: Request, res: Response) => {
  res.send('Hotel management API is running.');
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
