import {Request, Response, Router} from 'express';
import {cronAuth} from '../middleware/cron-auth';
import {reservationService} from '../services/reservation.service';

const router = Router();

// Cron diario (vercel.json, 00:00 de Argentina): da de baja las reservas pendientes que
// llegaron a su fecha de salida sin check-in.
router.get('/expire-reservations', cronAuth, async (_req: Request, res: Response) => {
  const expired = await reservationService.expireOverdue();
  res.json({expired});
});

export default router;
