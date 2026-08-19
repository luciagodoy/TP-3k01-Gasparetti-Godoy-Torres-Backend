import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import User from '../../models/User';
import CategoriaHabitacion from '../../models/categoriaHabitacion';

const login = async (username: string, password: string) => {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  return res.body.token as string;
};

describe('Autenticación y protección de rutas por rol', () => {
  beforeEach(async () => {
    await User.create({ username: 'huesped1', email: 'huesped1@example.com', password: 'clave123', role: 'huesped' });
    await User.create({ username: 'admin1', email: 'admin1@example.com', password: 'clave123', role: 'admin' });
  });

  it('POST /api/auth/login devuelve un token para credenciales válidas', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'huesped1', password: 'clave123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.usuario.password).toBeUndefined();
  });

  it('POST /api/auth/login rechaza credenciales inválidas', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'huesped1', password: 'incorrecta' });
    expect(res.status).toBe(401);
  });

  it('GET /api/habitaciones es público: no requiere token', async () => {
    const res = await request(app).get('/api/habitaciones');
    expect(res.status).toBe(200);
  });

  it('POST /api/habitaciones sin token es rechazado (401)', async () => {
    const res = await request(app).post('/api/habitaciones').send({ numero: 101, piso: 1, categoriaId: 1 });
    expect(res.status).toBe(401);
  });

  it('POST /api/habitaciones con token de huésped es rechazado (401): no es admin', async () => {
    const token = await login('huesped1', 'clave123');
    const res = await request(app)
      .post('/api/habitaciones')
      .set('Authorization', `Bearer ${token}`)
      .send({ numero: 101, piso: 1, categoriaId: 1 });
    expect(res.status).toBe(401);
  });

  it('POST /api/habitaciones con token de admin funciona', async () => {
    const categoria = await CategoriaHabitacion.create({
      denominacion: 'Standard',
      descripcion: 'Habitación básica',
      capacidadPersonas: 2,
      imagenUrl: null,
      precioNoche: 50000
    });
    const token = await login('admin1', 'clave123');
    const res = await request(app)
      .post('/api/habitaciones')
      .set('Authorization', `Bearer ${token}`)
      .send({ numero: 101, piso: 1, categoriaId: categoria.id });
    expect(res.status).toBe(201);
    expect(res.body.numero).toBe(101);
  });
});
