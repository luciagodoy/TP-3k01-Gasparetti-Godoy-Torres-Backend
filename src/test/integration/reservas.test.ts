import {describe, it, expect, beforeEach} from 'vitest';
import request from 'supertest';
import app from '../../app';
import User from '../../models/User';
import Provincia from '../../models/Provincia';
import Ciudad from '../../models/Ciudad';
import Huesped from '../../models/Huesped';
import CategoriaHabitacion from '../../models/categoriaHabitacion';
import Habitacion from '../../models/Habitacion';
import Reserva from '../../models/Reserva';

const crearReservaPendiente = async () => {
  const provincia = await Provincia.create({nombre: 'Santa Fe'});
  const ciudad = await Ciudad.create({nombre: 'Rosario', provinciaId: provincia.id});
  const usuario = await User.create({username: 'huesped1', email: 'huesped1@example.com', password: 'clave123', role: 'huesped'});
  const huesped = await Huesped.create({
    telefono: null,
    documentoIdentidad: '30111222',
    ciudadId: ciudad.id,
    pais: 'Argentina',
    userId: usuario.id
  });
  const categoria = await CategoriaHabitacion.create({
    denominacion: 'Standard',
    descripcion: 'Habitación básica',
    capacidadPersonas: 2,
    imagenesUrl: [],
    precioNoche: 50000
  });
  const habitacion = await Habitacion.create({numero: 101, piso: 1, estadoDisponibilidad: 'disponible', categoriaId: categoria.id});
  return Reserva.create({
    fechaInicio: '2026-11-01',
    fechaFin: '2026-11-03',
    estado: 'pendiente',
    montoTotal: 100000,
    huespedId: huesped.id,
    habitacionId: habitacion.id
  });
};

describe('PUT /api/reservas/:id: cambios de estado', () => {
  let token: string;

  beforeEach(async () => {
    await User.create({username: 'admin1', email: 'admin1@example.com', password: 'clave123', role: 'admin'});
    const res = await request(app).post('/api/auth/login').send({username: 'admin1', password: 'clave123'});
    token = res.body.token;
  });

  it('rechaza saltear el ciclo de vida (pendiente -> check-out) y no modifica la reserva', async () => {
    const reserva = await crearReservaPendiente();

    const res = await request(app).put(`/api/reservas/${reserva.id}`).set('Authorization', `Bearer ${token}`).send({estado: 'check-out'});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Transición inválida');
    await reserva.reload();
    expect(reserva.estado).toBe('pendiente');
  });

  it('rechaza hacer check-in por PUT: tiene su propio endpoint', async () => {
    const reserva = await crearReservaPendiente();

    const res = await request(app).put(`/api/reservas/${reserva.id}`).set('Authorization', `Bearer ${token}`).send({estado: 'check-in'});

    expect(res.status).toBe(400);
  });

  it('permite que el staff cancele una reserva pendiente', async () => {
    const reserva = await crearReservaPendiente();

    const res = await request(app).put(`/api/reservas/${reserva.id}`).set('Authorization', `Bearer ${token}`).send({estado: 'cancelada'});

    expect(res.status).toBe(200);
    await reserva.reload();
    expect(reserva.estado).toBe('cancelada');
  });
});
