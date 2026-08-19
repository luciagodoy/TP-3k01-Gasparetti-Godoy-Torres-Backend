import User from '../models/User';

export async function seedAdmin(): Promise<void> {
  const existente = await User.findOne({ where: { role: 'admin' } });
  if (existente) return;

  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = process.env.ADMIN_EMAIL || 'admin@hotel.local';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  await User.create({ username, email, password, role: 'admin' });

  console.log(`Usuario admin inicial creado (username: "${username}"). Si no configuraste ADMIN_PASSWORD en .env, cambiá la contraseña por defecto.`);
}
