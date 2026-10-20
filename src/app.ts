import express, {Request, Response} from 'express';
import cors from 'cors';
import helmet from 'helmet';
// Registers every entity and its associations. Imported here (and not only in
// index.ts) because on Vercel this file is the entry point: index.ts and its
// app.listen never run there.
import './entities';
import apiRouter from './routes';
import healthRouter from './routes/health.routes';
import {apiLimiter} from './middleware/rate-limit';
import {errorHandler, notFoundHandler} from './middleware/error-handler';

const app = express();

// Behind a reverse proxy (nginx, Render, Railway...) req.ip is the proxy's IP,
// so the rate limit would put every user in the same bucket. Opt-in on
// purpose: enabling it without a real proxy in front lets clients forge
// X-Forwarded-For and dodge the limit by rotating the key.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
}

// Standard security headers (X-Content-Type-Options, Referrer-Policy,
// X-Frame-Options...). crossOriginResourcePolicy is relaxed because the
// frontend runs on another origin and consumes this API.
app.use(helmet({crossOriginResourcePolicy: {policy: 'cross-origin'}}));
app.use(cors({origin: process.env.FRONTEND_URL || 'http://localhost:5173'}));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
// Express 5 leaves req.body undefined when there is no body; services always
// receive an object.
app.use((req, _res, next) => {
  req.body ??= {};
  next();
});

// Outside the rate limit on purpose: the platform polls /health every few
// seconds, and if a traffic spike used up the quota the check would get a 429,
// be read as an outage and a healthy container would be restarted.
app.use('/health', healthRouter);
app.use('/api', apiLimiter, apiRouter);

app.get('/', (_req: Request, res: Response) => {
  res.send('Hotel management API is running.');
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
