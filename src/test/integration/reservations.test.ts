import {describe, it, expect, beforeEach} from 'vitest';
import request from 'supertest';
import app from '../../app';
import {
  AdjustmentType,
  City,
  Guest,
  PricingRule,
  PricingRuleType,
  Province,
  Reservation,
  ReservationStatus,
  Role,
  Room,
  RoomCategory,
  RoomStatus,
  User
} from '../../entities';

const createGuest = async () => {
  const province = await Province.create({name: 'Santa Fe'});
  const city = await City.create({name: 'Rosario', provinceId: province.id});
  const user = await User.create({username: 'guest1', email: 'guest1@example.com', password: 'clave123', role: Role.GUEST});
  const guest = await Guest.create({phone: null, documentNumber: '30111222', cityId: city.id, country: 'Argentina', userId: user.id});
  return {user, guest};
};

const createRoom = async () => {
  const category = await RoomCategory.create({
    name: 'Standard',
    description: 'Habitación básica',
    capacity: 2,
    imageUrls: [],
    pricePerNight: 50000
  });
  return Room.create({number: 101, floor: 1, status: RoomStatus.AVAILABLE, categoryId: category.id});
};

const createPendingReservation = async () => {
  const {guest} = await createGuest();
  const room = await createRoom();
  return Reservation.create({
    startDate: '2026-11-01',
    endDate: '2026-11-03',
    status: ReservationStatus.PENDING,
    totalAmount: 100000,
    guestId: guest.id,
    roomId: room.id
  });
};

const login = async (username: string) => {
  const res = await request(app).post('/api/auth/login').send({username, password: 'clave123'});
  return res.body.token as string;
};

describe('Reservations', () => {
  let adminToken: string;

  beforeEach(async () => {
    await User.create({username: 'admin1', email: 'admin1@example.com', password: 'clave123', role: Role.ADMIN});
    adminToken = await login('admin1');
  });

  describe('POST /api/reservations validation', () => {
    it('answers 400, not 500, when fields are missing', async () => {
      const res = await request(app).post('/api/reservations').set('Authorization', `Bearer ${adminToken}`).send({startDate: '2026-11-01'});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Datos incompletos');
    });

    it('answers 400 when the end date is before the start date', async () => {
      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({startDate: '2026-11-05', endDate: '2026-11-01', guestId: 1, roomId: 1, totalAmount: 100});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('El rango de fechas es inválido');
    });
  });

  describe('PUT /api/reservations/:id status changes', () => {
    // Regression: the PUT accepted any status, so a reservation could go from
    // pending to checked-out without a check-in and the room was never occupied.
    it('rejects skipping the life cycle (pending -> check-out) and leaves the reservation untouched', async () => {
      const reservation = await createPendingReservation();

      const res = await request(app)
        .put(`/api/reservations/${reservation.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({status: ReservationStatus.CHECKED_OUT});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Transición inválida');
      await reservation.reload();
      expect(reservation.status).toBe(ReservationStatus.PENDING);
    });

    it('rejects a check-in through PUT: it has its own endpoint', async () => {
      const reservation = await createPendingReservation();

      const res = await request(app)
        .put(`/api/reservations/${reservation.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({status: ReservationStatus.CHECKED_IN});

      expect(res.status).toBe(400);
    });

    // Business decision: the amount is fixed when the reservation is made.
    // Moving the dates or the room keeps it, even with dynamic pricing active;
    // staff can still send a new totalAmount explicitly.
    it('keeps the amount when staff change the dates, even if the dynamic price differs', async () => {
      const reservation = await createPendingReservation(); // 2026-11-01 -> 2026-11-03, 100000
      await PricingRule.create({type: PricingRuleType.OCCUPANCY, from: 0, adjustmentType: AdjustmentType.PERCENTAGE, value: 50});

      const res = await request(app)
        .put(`/api/reservations/${reservation.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({startDate: '2026-11-10', endDate: '2026-11-15'});

      expect(res.status).toBe(200);
      await reservation.reload();
      expect(reservation.startDate).toBe('2026-11-10');
      expect(reservation.totalAmount).toBe(100000);
    });

    it('GET /api/reservations/:id returns the full guest data, without the password', async () => {
      const reservation = await createPendingReservation();

      const res = await request(app).get(`/api/reservations/${reservation.id}`).set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.guest.documentNumber).toBe('30111222');
      expect(res.body.guest.user.username).toBe('guest1');
      expect(res.body.guest.user.password).toBeUndefined();
      expect(res.body.guest.city.province.name).toBe('Santa Fe');
      expect(res.body.room.category.name).toBe('Standard');
    });

    it('lets staff cancel a pending reservation', async () => {
      const reservation = await createPendingReservation();

      const res = await request(app)
        .put(`/api/reservations/${reservation.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({status: ReservationStatus.CANCELLED});

      expect(res.status).toBe(200);
      await reservation.reload();
      expect(reservation.status).toBe(ReservationStatus.CANCELLED);
    });
  });

  describe('check-in / check-out flow', () => {
    it('check-in occupies the room and check-out frees it and returns the PDF receipt', async () => {
      const reservation = await createPendingReservation();
      const auth = {Authorization: `Bearer ${adminToken}`};

      const checkIn = await request(app).post(`/api/reservations/${reservation.id}/check-in`).set(auth);
      expect(checkIn.status).toBe(200);
      expect(checkIn.body.reservation.status).toBe(ReservationStatus.CHECKED_IN);
      expect((await Room.findByPk(reservation.roomId))?.status).toBe(RoomStatus.OCCUPIED);

      const checkOut = await request(app).post(`/api/reservations/${reservation.id}/check-out`).set(auth);
      expect(checkOut.status).toBe(200);
      expect(checkOut.headers['content-type']).toBe('application/pdf');
      expect((await Room.findByPk(reservation.roomId))?.status).toBe(RoomStatus.AVAILABLE);
    });

    // Same-day turnover: the next guest can check in on the day the previous one
    // leaves, but only once the previous one has actually checked out. Otherwise
    // the late check-out would mark the room as available with someone inside.
    it('blocks the check-in of the next reservation while the previous one is still checked in', async () => {
      const previous = await createPendingReservation(); // 2026-11-01 -> 2026-11-03
      const next = await Reservation.create({
        startDate: '2026-11-03',
        endDate: '2026-11-05',
        status: ReservationStatus.PENDING,
        totalAmount: 100000,
        guestId: previous.guestId,
        roomId: previous.roomId
      });
      const auth = {Authorization: `Bearer ${adminToken}`};
      await request(app).post(`/api/reservations/${previous.id}/check-in`).set(auth);

      const blocked = await request(app).post(`/api/reservations/${next.id}/check-in`).set(auth);
      expect(blocked.status).toBe(400);
      expect(blocked.body.error).toBe('Habitación ocupada');
      await next.reload();
      expect(next.status).toBe(ReservationStatus.PENDING);

      await request(app).post(`/api/reservations/${previous.id}/check-out`).set(auth);
      const allowed = await request(app).post(`/api/reservations/${next.id}/check-in`).set(auth);
      expect(allowed.status).toBe(200);
      expect((await Room.findByPk(next.roomId))?.status).toBe(RoomStatus.OCCUPIED);
    });

    it('check-out of a reservation that never checked in is rejected', async () => {
      const reservation = await createPendingReservation();

      const res = await request(app).post(`/api/reservations/${reservation.id}/check-out`).set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Transición inválida');
    });
  });

  describe('guest self-service', () => {
    it('a guest books a room and the amount is computed by the server from the category price', async () => {
      await createGuest();
      const room = await createRoom();
      const guestToken = await login('guest1');

      const res = await request(app)
        .post('/api/reservations/mine')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({roomId: room.id, startDate: '2026-12-01', endDate: '2026-12-04', totalAmount: 1});

      expect(res.status).toBe(201);
      expect(res.body.reservation.totalAmount).toBe(150000); // 3 nights x 50000, the sent amount is ignored
    });

    it('a guest cannot book a room that is already taken for those dates', async () => {
      const reservation = await createPendingReservation();
      const guestToken = await login('guest1');

      const res = await request(app)
        .post('/api/reservations/mine')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({roomId: reservation.roomId, startDate: '2026-11-02', endDate: '2026-11-05'});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Habitación no disponible');
    });

    it('a stay that covers an existing reservation entirely is still rejected', async () => {
      const reservation = await createPendingReservation(); // 2026-11-01 -> 2026-11-03
      const guestToken = await login('guest1');

      const res = await request(app)
        .post('/api/reservations/mine')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({roomId: reservation.roomId, startDate: '2026-10-31', endDate: '2026-11-04'});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Habitación no disponible');
    });
  });

  // Business rule: check-out is until 10:00 of the last day and check-in from
  // 15:00 of the first day, so a stay may start on the day another one ends.
  describe('same-day turnover', () => {
    it.each([
      ['starts on the day the existing one ends', '2026-11-03', '2026-11-05'],
      ['ends on the day the existing one starts', '2026-10-30', '2026-11-01']
    ])('a guest can book a stay that %s', async (_case, startDate, endDate) => {
      const reservation = await createPendingReservation(); // 2026-11-01 -> 2026-11-03
      const guestToken = await login('guest1');

      const res = await request(app)
        .post('/api/reservations/mine')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({roomId: reservation.roomId, startDate, endDate});

      expect(res.status).toBe(201);
    });

    it('the room search offers a room for a stay that starts on its checkout day', async () => {
      const reservation = await createPendingReservation(); // 2026-11-01 -> 2026-11-03

      const res = await request(app).get('/api/rooms').query({startDate: '2026-11-03', endDate: '2026-11-05'});

      expect(res.status).toBe(200);
      expect(res.body.map((room: {id: number}) => room.id)).toContain(reservation.roomId);
    });
  });
});
