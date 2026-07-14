import { Router } from 'express';
import habitacionRouter from './habitacionRoutes';
import huespedRouter from './huespedRoutes';
import reservaRouter from './reservaRoutes';

const masterRouter = Router();

masterRouter.use('/habitaciones', habitacionRouter);
masterRouter.use('/huespedes', huespedRouter);
masterRouter.use('/reservas', reservaRouter);

export default masterRouter;