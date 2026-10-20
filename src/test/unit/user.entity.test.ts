import {describe, it, expect} from 'vitest';
import {Role, User} from '../../entities';

describe('User entity', () => {
  it('hashes the password on create (never stores it in plain text)', async () => {
    const user = await User.create({username: 'juan', email: 'juan@example.com', password: 'miClaveSecreta', role: Role.GUEST});

    expect(user.password).not.toBe('miClaveSecreta');
    expect(user.password.length).toBeGreaterThan(20);
  });

  it('comparePassword accepts the right password and rejects a wrong one', async () => {
    const user = await User.create({username: 'maria', email: 'maria@example.com', password: 'otraClave123', role: Role.ADMIN});

    expect(await user.comparePassword('otraClave123')).toBe(true);
    expect(await user.comparePassword('claveIncorrecta')).toBe(false);
  });

  it('re-hashes the password only when it changes, not on every save', async () => {
    const user = await User.create({username: 'pedro', email: 'pedro@example.com', password: 'claveOriginal', role: Role.GUEST});
    const originalHash = user.password;

    user.username = 'pedro2';
    await user.save();

    expect(user.password).toBe(originalHash);
  });

  it('toSafeJSON leaves the password hash out', async () => {
    const user = await User.create({username: 'ana', email: 'ana@example.com', password: 'clave123', role: Role.GUEST});

    expect(user.toSafeJSON()).not.toHaveProperty('password');
    expect(user.toSafeJSON().username).toBe('ana');
  });
});
