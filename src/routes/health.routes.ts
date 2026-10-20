import {Router, Request, Response} from 'express';
import {sequelize} from '../config/database';

const healthRouter = Router();

// Liveness: is the process alive? It does not touch the database on purpose:
// if it reported MySQL's state, a 10-second network blip would make the
// platform think the container is broken and restart it, when all it had to
// do was wait.
healthRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({status: 'ok', uptimeSeconds: Math.round(process.uptime())});
});

// Readiness: can it actually serve requests? This one checks the database,
// because without it the API is useless. It answers 503 so the load balancer
// stops routing traffic without killing the process.
healthRouter.get('/detailed', async (_req: Request, res: Response) => {
  const start = Date.now();
  let database: {status: string; latencyMs?: number; detail?: string};

  try {
    await sequelize.authenticate();
    database = {status: 'ok', latencyMs: Date.now() - start};
  } catch {
    // No error detail: this endpoint is public and Sequelize's message may
    // include the database host, user and port.
    database = {status: 'error', detail: 'Database unreachable'};
  }

  const healthy = database.status === 'ok';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    checks: {database}
  });
});

export default healthRouter;
