import {Router, Request, Response} from 'express';
import {sequelize} from '../config/database';

const healthRouter = Router();

// Liveness: ¿el proceso está vivo? No toca la base a propósito. Si respondiera
// según el estado de MySQL, un corte de red de 10 segundos haría que la
// plataforma concluya que el contenedor está roto y lo reinicie, cuando en
// realidad lo único que había que hacer era esperar.
healthRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    estado: 'ok',
    uptimeSegundos: Math.round(process.uptime())
  });
});

// Readiness: ¿puede atender pedidos de verdad? Esta sí verifica la base, porque
// sin base la API no sirve para nada. Devuelve 503 para que el balanceador deje
// de mandarle tráfico sin matar el proceso.
healthRouter.get('/detallado', async (_req: Request, res: Response) => {
  const inicio = Date.now();
  let baseDeDatos: {estado: string; latenciaMs?: number; detalle?: string};

  try {
    await sequelize.authenticate();
    baseDeDatos = {estado: 'ok', latenciaMs: Date.now() - inicio};
  } catch {
    // Sin detalle del error: este endpoint es público y el mensaje de Sequelize
    // puede incluir host, usuario y puerto de la base.
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
