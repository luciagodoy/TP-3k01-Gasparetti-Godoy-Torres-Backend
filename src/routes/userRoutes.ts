import { Router, Request, Response, NextFunction } from 'express';
import User from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      token?: string;
    }
  }
}