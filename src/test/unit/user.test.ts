import { describe, it, expect } from 'vitest';
import User from '../../models/User';

describe('User', () => {
  it('hashea la contraseña al crear el usuario (no la guarda en texto plano)', async () => {
    const user = await User.create({
      username: 'juan',
      email: 'juan@example.com',
      password: 'miClaveSecreta',
      role: 'huesped'
    });

    expect(user.password).not.toBe('miClaveSecreta');
    expect(user.password.length).toBeGreaterThan(20);
  });

  it('comparePassword acepta la contraseña correcta y rechaza una incorrecta', async () => {
    const user = await User.create({
      username: 'maria',
      email: 'maria@example.com',
      password: 'otraClave123',
      role: 'admin'
    });

    expect(await user.comparePassword('otraClave123')).toBe(true);
    expect(await user.comparePassword('claveIncorrecta')).toBe(false);
  });

  it('re-hashea la contraseña solo cuando cambia, no en cada guardado', async () => {
    const user = await User.create({
      username: 'pedro',
      email: 'pedro@example.com',
      password: 'claveOriginal',
      role: 'huesped'
    });
    const hashOriginal = user.password;

    user.username = 'pedro2';
    await user.save();

    expect(user.password).toBe(hashOriginal);
  });
});
