import {Role} from '../entities';
import {userRepository} from '../repositories/user.repository';

// User management requires the admin role, so the first admin cannot be created
// through the API. On startup, if there is no admin yet, one is created from
// ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD.
export async function seedAdmin(): Promise<void> {
  if (await userRepository.findAnyAdmin()) return;

  // No default password in production: an "admin123" admin on the real
  // database can be guessed by anyone who reads the README. Startup stops, as
  // it does without JWT_SECRET. Only applies while there is no admin, so the
  // variable is not required after the first deploy.
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
