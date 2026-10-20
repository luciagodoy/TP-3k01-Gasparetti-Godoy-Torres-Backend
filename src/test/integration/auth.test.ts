import {describe, it, expect, beforeEach} from 'vitest';
import request from 'supertest';
import app from '../../app';
import {Role, RoomCategory, User} from '../../entities';

const login = async (username: string, password: string) => {
  const res = await request(app).post('/api/auth/login').send({username, password});
  return res.body.token as string;
};

describe('Authentication and role-based route protection', () => {
  beforeEach(async () => {
    await User.create({username: 'guest1', email: 'guest1@example.com', password: 'clave123', role: Role.GUEST});
    await User.create({username: 'admin1', email: 'admin1@example.com', password: 'clave123', role: Role.ADMIN});
  });

  it('POST /api/auth/login returns a token for valid credentials and never the password', async () => {
    const res = await request(app).post('/api/auth/login').send({username: 'guest1', password: 'clave123'});

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.username).toBe('guest1');
    expect(res.body.user.password).toBeUndefined();
  });

  it('POST /api/auth/login rejects invalid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({username: 'guest1', password: 'wrong'});
    expect(res.status).toBe(401);
  });

  it('GET /api/rooms is public: no token required', async () => {
    const res = await request(app).get('/api/rooms');
    expect(res.status).toBe(200);
  });

  it('POST /api/rooms without a token is rejected (401)', async () => {
    const res = await request(app).post('/api/rooms').send({number: 101, floor: 1, categoryId: 1});
    expect(res.status).toBe(401);
  });

  it('POST /api/rooms with a guest token is rejected (403): not staff', async () => {
    const token = await login('guest1', 'clave123');
    const res = await request(app).post('/api/rooms').set('Authorization', `Bearer ${token}`).send({number: 101, floor: 1, categoryId: 1});
    expect(res.status).toBe(403);
  });

  it('POST /api/rooms with an admin token works', async () => {
    const category = await RoomCategory.create({
      name: 'Standard',
      description: 'Habitación básica',
      capacity: 2,
      imageUrls: [],
      pricePerNight: 50000
    });
    const token = await login('admin1', 'clave123');

    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({number: 101, floor: 1, categoryId: category.id});

    expect(res.status).toBe(201);
    expect(res.body.number).toBe(101);
  });

  it('an unknown route answers a JSON 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeTruthy();
  });

  it('a non-numeric id answers 400 instead of hitting the database', async () => {
    const res = await request(app).get('/api/provinces/abc');
    expect(res.status).toBe(400);
  });
});
