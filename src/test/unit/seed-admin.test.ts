import {describe, it, expect, afterEach} from 'vitest';
import {Role, User} from '../../entities';
import {seedAdmin} from '../../config/seed-admin';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

describe('seedAdmin', () => {
  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    if (ORIGINAL_ADMIN_PASSWORD === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = ORIGINAL_ADMIN_PASSWORD;
  });

  it('in production without ADMIN_PASSWORD it refuses to create an admin with the default password', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ADMIN_PASSWORD;

    await expect(seedAdmin()).rejects.toThrow(/ADMIN_PASSWORD/);
    expect(await User.count({where: {role: Role.ADMIN}})).toBe(0);
  });

  it('in production, when an admin already exists, ADMIN_PASSWORD is not required', async () => {
    await User.create({username: 'admin1', email: 'admin1@example.com', password: 'clave123', role: Role.ADMIN});
    process.env.NODE_ENV = 'production';
    delete process.env.ADMIN_PASSWORD;

    await expect(seedAdmin()).resolves.toBeUndefined();
    expect(await User.count({where: {role: Role.ADMIN}})).toBe(1);
  });

  it('outside production it creates the admin with the default values', async () => {
    delete process.env.ADMIN_PASSWORD;

    await seedAdmin();

    const admin = await User.findOne({where: {role: Role.ADMIN}});
    expect(admin?.username).toBe('admin');
    expect(await admin?.comparePassword('admin123')).toBe(true);
  });
});
