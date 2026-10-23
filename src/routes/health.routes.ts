import {Router, Request, Response} from 'express';
import {sequelize} from '../config/database';

const healthRouter = Router();
healthRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({status: 'ok', uptimeSeconds: Math.round(process.uptime())});
});

healthRouter.get('/detailed', async (_req: Request, res: Response) => {
  const start = Date.now();
  let database: {status: string; latencyMs?: number; detail?: string};

  try {
    await sequelize.authenticate();
    database = {status: 'ok', latencyMs: Date.now() - start};
  } catch {
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
