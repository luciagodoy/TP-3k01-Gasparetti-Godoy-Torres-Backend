import {describe, it, expect, beforeEach} from 'vitest';
import request from 'supertest';
import app from '../../app';
import {City, Guest, Province, Role, User} from '../../entities';

let cityId: number;

const validRegistration = () => ({
  username: 'ana.perez',
  email: 'Ana.Perez@Example.com',
  password: 'clave123',
  phone: '+54 341 555-1234',
  documentNumber: '30111222',
  cityId
});

const register = (body: object) => request(app).post('/api/guests/register').send(body);
const login = (body: object) => request(app).post('/api/auth/login').send(body);

describe('Guest registration', () => {
  beforeEach(async () => {
    const province = await Province.create({name: 'Santa Fe'});
    cityId = (await City.create({name: 'Rosario', provinceId: province.id})).id;
  });

  it('creates the account and its guest profile, storing the email in lowercase', async () => {
    const res = await register(validRegistration());

    expect(res.status).toBe(201);
    const user = await User.findOne({where: {username: 'ana.perez'}});
    expect(user?.email).toBe('ana.perez@example.com');
    expect(await Guest.count({where: {userId: user!.id}})).toBe(1);
  });

  it('answers 400 with a message for every invalid field, before touching the database', async () => {
    const res = await register({username: 'a', email: 'no-es-un-email', password: 'corta', documentNumber: '12.345', cityId: ''});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos de registro inválidos');
    expect(Object.keys(res.body.fields).sort()).toEqual(['cityId', 'documentNumber', 'email', 'password', 'username']);
    expect(await User.count()).toBe(0);
  });

  it('asks for letters and numbers in the password', async () => {
    const res = await register({...validRegistration(), password: 'solamenteletras'});

    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual({password: 'La contraseña debe combinar letras y números.'});
  });

  it('answers 409 naming each field already taken, ignoring the email case', async () => {
    await register(validRegistration());

    const res = await register({...validRegistration(), email: 'ANA.PEREZ@example.com'});

    expect(res.status).toBe(409);
    expect(res.body.fields).toEqual({
      username: 'Ese nombre de usuario ya está en uso.',
      email: 'Ya existe una cuenta con ese email.',
      documentNumber: 'Ya hay un huésped registrado con ese documento.'
    });
    expect(await User.count()).toBe(1);
  });

  it('rejects a city that does not exist', async () => {
    const res = await register({...validRegistration(), cityId: 9999});

    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual({cityId: 'La ciudad elegida no existe.'});
  });
});

describe('Login errors', () => {
  beforeEach(async () => {
    await User.create({username: 'guest1', email: 'guest1@example.com', password: 'clave123', role: Role.GUEST});
  });

  it('answers 400 with the missing fields', async () => {
    const res = await login({username: '  '});

    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual({username: 'Ingresá tu usuario o email.', password: 'Ingresá tu contraseña.'});
  });

  it('answers 401 with a readable message, the same whether the user exists or not', async () => {
    const wrongPassword = await login({username: 'guest1', password: 'otra1234'});
    const unknownUser = await login({username: 'nadie', password: 'otra1234'});

    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownUser.body);
    expect(wrongPassword.body.message).toBe('El usuario o la contraseña no son correctos.');
  });

  it('accepts the email whatever its case, and a username with surrounding spaces', async () => {
    expect((await login({username: 'GUEST1@Example.com', password: 'clave123'})).status).toBe(200);
    expect((await login({username: ' guest1 ', password: 'clave123'})).status).toBe(200);
  });
});
