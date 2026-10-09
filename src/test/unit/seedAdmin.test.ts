import {describe, it, expect, afterEach} from 'vitest';
import User from '../../models/User';
import {seedAdmin} from '../../config/seedAdmin';

const NODE_ENV_ORIGINAL = process.env.NODE_ENV;
const ADMIN_PASSWORD_ORIGINAL = process.env.ADMIN_PASSWORD;

describe('seedAdmin', () => {
  afterEach(() => {
    process.env.NODE_ENV = NODE_ENV_ORIGINAL;
    if (ADMIN_PASSWORD_ORIGINAL === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = ADMIN_PASSWORD_ORIGINAL;
  });

  it('en producción y sin ADMIN_PASSWORD no crea un admin con la contraseña por defecto', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ADMIN_PASSWORD;

    await expect(seedAdmin()).rejects.toThrow(/ADMIN_PASSWORD/);
    expect(await User.count({where: {role: 'admin'}})).toBe(0);
  });

  it('en producción, si ya existe un admin, no exige ADMIN_PASSWORD', async () => {
    await User.create({username: 'admin1', email: 'admin1@example.com', password: 'clave123', role: 'admin'});
    process.env.NODE_ENV = 'production';
    delete process.env.ADMIN_PASSWORD;

    await expect(seedAdmin()).resolves.toBeUndefined();
    expect(await User.count({where: {role: 'admin'}})).toBe(1);
  });

  it('fuera de producción crea el admin con los valores por defecto', async () => {
    delete process.env.ADMIN_PASSWORD;

    await seedAdmin();

    const admin = await User.findOne({where: {role: 'admin'}});
    expect(admin?.username).toBe('admin');
    expect(await admin?.comparePassword('admin123')).toBe(true);
  });
});
