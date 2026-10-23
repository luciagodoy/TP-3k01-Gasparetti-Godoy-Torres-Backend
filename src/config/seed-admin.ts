import {Role} from '../entities';
import {userRepository} from '../repositories/user.repository';

// La gestión de usuarios requiere el rol admin, así que el primer admin no se puede
// crear por la API. Al arrancar, si todavía no hay ningún admin, se crea uno a partir de
// ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD.
export async function seedAdmin(): Promise<void> {
  if (await userRepository.findAnyAdmin()) return;
  if (!process.env.ADMIN_PASSWORD && process.env.NODE_ENV === 'production') {
    throw new Error('Missing ADMIN_PASSWORD: the initial admin account is not created with the default password in production.');
  }

  const username = process.env.ADMIN_USERNAME || 'admin';
  await userRepository.create({
    username,
    email: process.env.ADMIN_EMAIL || 'admin@hotel.local',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    role: Role.ADMIN
  });

  console.log(`Initial admin user created (username: "${username}"). If ADMIN_PASSWORD is not set, change the default password.`);
}
