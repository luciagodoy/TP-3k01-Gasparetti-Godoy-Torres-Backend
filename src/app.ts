import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import masterRouter from './routes';

const app = express();

// Cabeceras de seguridad estándar (X-Content-Type-Options, Referrer-Policy,
// X-Frame-Options, etc.). crossOriginResourcePolicy se relaja porque el front
// corre en otro origen y consume esta API.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', masterRouter);

app.get('/', (req: Request, res: Response) => {
  res.send('¡Servidor Express + TypeScript + Sequelize funcionando!');
});

export default app;
