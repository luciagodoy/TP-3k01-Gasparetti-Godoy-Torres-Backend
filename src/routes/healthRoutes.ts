import {Router, Request, Response} from 'express';
import {sequelize} from '../config/database';

const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    estado: 'ok',
    uptimeSegundos: Math.round(process.uptime())
  });
});

// Readiness: verifica la base Devuelve 503 para que el balanceador deje
// de mandarle tráfico sin matar el proceso.
healthRouter.get('/detallado', async (_req: Request, res: Response) => {
  const inicio = Date.now();
  let baseDeDatos: {estado: string; latenciaMs?: number; detalle?: string};

  try {
    await sequelize.authenticate();
    baseDeDatos = {estado: 'ok', latenciaMs: Date.now() - inicio};
  } catch {
    baseDeDatos = {estado: 'error', detalle: 'Base de datos inalcanzable'};
  }

  const todoOk = baseDeDatos.estado === 'ok';

  res.status(todoOk ? 200 : 503).json({
    estado: todoOk ? 'ok' : 'degradado',
    timestamp: new Date().toISOString(),
    uptimeSegundos: Math.round(process.uptime()),
    chequeos: {baseDeDatos}
  });
});

export default healthRouter;
