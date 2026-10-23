import {describe, it, expect, vi} from 'vitest';
import {Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import {Role, User} from '../entities';
import auth from './auth';

const fakeRequest = (token?: string): Request =>
  ({
    header: (name: string) => (name === 'Authorization' && token ? `Bearer ${token}` : undefined)
  }) as unknown as Request;

const fakeResponse = (): Response => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res as Response;
};

const tokenFor = (userId: number) => jwt.sign({id: userId}, process.env.JWT_SECRET || 'mySecret');

const createUser = (username: string, role: Role) => User.create({username, email: `${username}@example.com`, password: 'clave123', role});

describe('auth middleware', () => {
  it('rejects with 401 when there is no Authorization header', async () => {
    const res = fakeResponse();
    const next = vi.fn();

    await auth.simple(fakeRequest(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects with 401 when the token is invalid', async () => {
    const res = fakeResponse();
    const next = vi.fn();

    await auth.simple(fakeRequest('invalid-token'), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('auth.simple lets any logged-in user through, whatever the role', async () => {
    const user = await createUser('guest1', Role.GUEST);
    const req = fakeRequest(tokenFor(user.id));
    const next = vi.fn();

    await auth.simple(req, fakeResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user?.id).toBe(user.id);
  });

  it('auth.staff rejects a guest', async () => {
    const user = await createUser('guest2', Role.GUEST);
    const res = fakeResponse();
    const next = vi.fn();

    await auth.staff(fakeRequest(tokenFor(user.id)), res, next);

    // Token válido pero rol insuficiente: 403, no 401 (no debe cerrar la sesión del usuario).
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('auth.staff lets an employee through', async () => {
    const user = await createUser('employee1', Role.EMPLOYEE);
    const next = vi.fn();

    await auth.staff(fakeRequest(tokenFor(user.id)), fakeResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('auth.staff lets an admin through', async () => {
    const user = await createUser('admin1', Role.ADMIN);
    const next = vi.fn();

    await auth.staff(fakeRequest(tokenFor(user.id)), fakeResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('auth.admin rejects an employee', async () => {
    const user = await createUser('employee2', Role.EMPLOYEE);
    const res = fakeResponse();
    const next = vi.fn();

    await auth.admin(fakeRequest(tokenFor(user.id)), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('auth.admin lets an admin through', async () => {
    const user = await createUser('admin2', Role.ADMIN);
    const next = vi.fn();

    await auth.admin(fakeRequest(tokenFor(user.id)), fakeResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
