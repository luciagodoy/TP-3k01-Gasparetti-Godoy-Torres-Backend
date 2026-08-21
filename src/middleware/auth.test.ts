import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import auth from './auth';

// No queremos conectarnos a MySQL en los tests: simulamos jwt y el modelo User.
jest.mock('jsonwebtoken');
jest.mock('../models/User');

const mockedJwt = jwt as jest.Mocked<typeof jwt>;
const mockedUser = User as jest.Mocked<typeof User>;

function crearRequestFalso(token?: string): Request {
  return {
    header: (nombre: string) => (nombre === 'Authorization' && token ? `Bearer ${token}` : undefined),
  } as unknown as Request;
}

function crearResponseFalso(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('middleware de autenticación', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rechaza con 401 si no viene el header Authorization', async () => {
    const req = crearRequestFalso();
    const res = crearResponseFalso();
    const next = jest.fn();

    await auth.simple(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza con 401 si el token es inválido', async () => {
    mockedJwt.verify.mockImplementation(() => {
      throw new Error('token inválido');
    });
    const req = crearRequestFalso('token-invalido');
    const res = crearResponseFalso();
    const next = jest.fn();

    await auth.simple(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('auth.simple deja pasar a cualquier usuario logueado, sin importar el rol', async () => {
    mockedJwt.verify.mockReturnValue({ id: 1 } as any);
    mockedUser.findByPk.mockResolvedValue({ id: 1, role: 'huesped' } as any);
    const req = crearRequestFalso('token-valido');
    const res = crearResponseFalso();
    const next = jest.fn();

    await auth.simple(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ id: 1, role: 'huesped' });
  });

  it('auth.staff rechaza a un huésped', async () => {
    mockedJwt.verify.mockReturnValue({ id: 1 } as any);
    mockedUser.findByPk.mockResolvedValue({ id: 1, role: 'huesped' } as any);
    const req = crearRequestFalso('token-valido');
    const res = crearResponseFalso();
    const next = jest.fn();

    await auth.staff(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('auth.staff deja pasar a un empleado', async () => {
    mockedJwt.verify.mockReturnValue({ id: 2 } as any);
    mockedUser.findByPk.mockResolvedValue({ id: 2, role: 'empleado' } as any);
    const req = crearRequestFalso('token-valido');
    const res = crearResponseFalso();
    const next = jest.fn();

    await auth.staff(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('auth.staff deja pasar a un admin', async () => {
    mockedJwt.verify.mockReturnValue({ id: 3 } as any);
    mockedUser.findByPk.mockResolvedValue({ id: 3, role: 'admin' } as any);
    const req = crearRequestFalso('token-valido');
    const res = crearResponseFalso();
    const next = jest.fn();

    await auth.staff(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('auth.admin rechaza a un empleado (no es admin)', async () => {
    mockedJwt.verify.mockReturnValue({ id: 2 } as any);
    mockedUser.findByPk.mockResolvedValue({ id: 2, role: 'empleado' } as any);
    const req = crearRequestFalso('token-valido');
    const res = crearResponseFalso();
    const next = jest.fn();

    await auth.admin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('auth.admin deja pasar a un admin', async () => {
    mockedJwt.verify.mockReturnValue({ id: 3 } as any);
    mockedUser.findByPk.mockResolvedValue({ id: 3, role: 'admin' } as any);
    const req = crearRequestFalso('token-valido');
    const res = crearResponseFalso();
    const next = jest.fn();

    await auth.admin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
