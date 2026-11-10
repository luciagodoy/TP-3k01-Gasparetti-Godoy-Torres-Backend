import {timingSafeEqual} from 'node:crypto';
import {RequestHandler} from 'express';

// Los crons de Vercel llaman con `Authorization: Bearer <CRON_SECRET>`. Sin CRON_SECRET
// configurado el endpoint queda cerrado: nunca se ejecuta por un pedido anónimo.
export const cronAuth: RequestHandler = (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  const expected = Buffer.from(`Bearer ${secret ?? ''}`);
  const received = Buffer.from(req.headers.authorization ?? '');
  if (!secret || expected.length !== received.length || !timingSafeEqual(expected, received)) {
    res.status(401).json({error: 'No autorizado'});
    return;
  }
  next();
};
