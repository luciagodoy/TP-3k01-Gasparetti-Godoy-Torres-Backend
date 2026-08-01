import { Router } from 'express';
import habitacionRouter from './habitacionRoutes';
import huespedRouter from './huespedRoutes';
import reservaRouter from './reservaRoutes';
import categoriaRouter from './categoriaRoutes';
import authRouter from './authRoutes';
import provinciaRouter from './provinciaRoutes';
import ciudadRouter from './ciudadRoutes';
import servicioRouter from './servicioRoutes';
import cupoRouter from './cupoRoutes';
import precioServicioRouter from './precioServicioRoutes';
import reservaServicioRouter from './reservaServicioRoutes';
import empleadoRouter from './empleadoRoutes';
import userRouter from './userRoutes';

const masterRouter = Router();

masterRouter.use('/habitaciones', habitacionRouter);
masterRouter.use('/huespedes', huespedRouter);
masterRouter.use('/reservas', reservaRouter);
masterRouter.use('/categorias', categoriaRouter);
masterRouter.use('/auth', authRouter);
masterRouter.use('/provincias', provinciaRouter);
masterRouter.use('/ciudades', ciudadRouter);
masterRouter.use('/servicios', servicioRouter);
masterRouter.use('/cupos', cupoRouter);
masterRouter.use('/precios-servicio', precioServicioRouter);
masterRouter.use('/reserva-servicios', reservaServicioRouter);
masterRouter.use('/empleados', empleadoRouter);
masterRouter.use('/usuarios', userRouter);

export default masterRouter;
