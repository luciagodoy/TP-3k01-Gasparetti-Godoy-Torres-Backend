import express, { Request, Response } from 'express';
import cors from 'cors';
import masterRouter from './routes';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', masterRouter);

app.get('/', (req: Request, res: Response) => {
  res.send('¡Servidor Express + TypeScript + Sequelize funcionando!');
});

export default app;
