import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import auth from './auth';

const crearRequestFalso = (token?: string): Request =>
  ({
    header: (nombre: string) => (nombre === 'Authorization' && token ? `Bearer ${token}` : undefined),
  }) as unknown as Request;

const crearResponseFalso = (): Response => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res as Response;
};

const tokenPara = (userId: number) => jwt.sign({ id: userId }, process.env.JWT_SECRET || 'mySecret');

describe('middleware de autenticación', () => {
  it('rechaza con 401 si no viene el header Authorization', async () => {
    const req = crearRequestFalso();
    const res = crearResponseFalso();
    const next = vi.fn();

    await auth.simple(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza con 401 si el token es inválido', async () => {
    const req = crearRequestFalso('token-invalido');
    const res = crearResponseFalso();
    const next = vi.fn();

    await auth.simple(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('auth.simple deja pasar a cualquier usuario logueado, sin importar el rol', async () => {
    const user = await User.create({ username: 'huesped1', email: 'huesped1@example.com', password: 'clave123', role: 'huesped' });
    const req = crearRequestFalso(tokenPara(user.id));
    const res = crearResponseFalso();
    const next = vi.fn();

    await auth.simple(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user?.id).toBe(user.id);
  });

  it('auth.staff rechaza a un huésped', async () => {
    const user = await User.create({ username: 'huesped2', email: 'huesped2@example.com', password: 'clave123', role: 'huesped' });
    const req = crearRequestFalso(tokenPara(user.id));
    const res = crearResponseFalso();
    const next = vi.fn();

    await auth.staff(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('auth.staff deja pasar a un empleado', async () => {
    const user = await User.create({ username: 'empleado1', email: 'empleado1@example.com', password: 'clave123', role: 'empleado' });
    const req = crearRequestFalso(tokenPara(user.id));
    const res = crearResponseFalso();
    const next = vi.fn();

    await auth.staff(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('auth.staff deja pasar a un admin', async () => {
    const user = await User.create({ username: 'admin1', email: 'admin1@example.com', password: 'clave123', role: 'admin' });
    const req = crearRequestFalso(tokenPara(user.id));
    const res = crearResponseFalso();
    const next = vi.fn();

    await auth.staff(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('auth.admin rechaza a un empleado (no es admin)', async () => {
    const user = await User.create({ username: 'empleado2', email: 'empleado2@example.com', password: 'clave123', role: 'empleado' });
    const req = crearRequestFalso(tokenPara(user.id));
    const res = crearResponseFalso();
    const next = vi.fn();

    await auth.admin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('auth.admin deja pasar a un admin', async () => {
    const user = await User.create({ username: 'admin2', email: 'admin2@example.com', password: 'clave123', role: 'admin' });
    const req = crearRequestFalso(tokenPara(user.id));
    const res = crearResponseFalso();
    const next = vi.fn();

    await auth.admin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
