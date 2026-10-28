import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import request from 'supertest';
import app from '../../app';
import {
  AdjustmentType,
  Amenity,
  AmenityQuota,
  City,
  Guest,
  PricingRule,
  PricingRuleType,
  Province,
  Reservation,
  ReservationAmenity,
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

const useHotelClock = () => {
  beforeEach(() => {
    vi.useFakeTimers({toFake: ['Date']});
  });
  afterEach(() => {
    vi.useRealTimers();
  });
};

describe('Reservations', () => {
  let adminToken: string;

  beforeEach(async () => {
    await User.create({username: 'admin1', email: 'admin1@example.com', password: 'clave123', role: Role.ADMIN});
    adminToken = await login('admin1');
  });

  // Pone el reloj en una fecha y hora de Argentina (UTC-3). Sólo se falsea Date, así
  // siguen funcionando los timers de los que depende supertest. El token se renueva
  // porque el JWT dura un día y vencería al mover el reloj.
  const atHotel = async (date: string, time: string) => {
    vi.setSystemTime(new Date(`${date}T${time}:00-03:00`));
    adminToken = await login('admin1');
  };

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

    // Decisión de negocio: el monto queda fijo cuando se hace la reserva.
    // Mover las fechas o la habitación lo conserva, incluso con tarifa dinámica activa;
    // el staff igual puede enviar un totalAmount nuevo explícitamente.
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
    useHotelClock();

    it('check-in occupies the room and check-out frees it and returns the PDF receipt', async () => {
      const reservation = await createPendingReservation();
      // Función y no objeto: el token cambia cada vez que se mueve el reloj.
      const auth = () => ({Authorization: `Bearer ${adminToken}`});
      await atHotel('2026-11-01', '16:00');

      const checkIn = await request(app).post(`/api/reservations/${reservation.id}/check-in`).set(auth());
      expect(checkIn.status).toBe(200);
      expect(checkIn.body.reservation.status).toBe(ReservationStatus.CHECKED_IN);
      expect((await Room.findByPk(reservation.roomId))?.status).toBe(RoomStatus.OCCUPIED);

      const checkOut = await request(app).post(`/api/reservations/${reservation.id}/check-out`).set(auth());
      expect(checkOut.status).toBe(200);
      expect(checkOut.headers['content-type']).toBe('application/pdf');
      expect((await Room.findByPk(reservation.roomId))?.status).toBe(RoomStatus.AVAILABLE);
    });

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
      // Función y no objeto: el token cambia cada vez que se mueve el reloj.
      const auth = () => ({Authorization: `Bearer ${adminToken}`});
      await atHotel('2026-11-01', '16:00');
      await request(app).post(`/api/reservations/${previous.id}/check-in`).set(auth());

      // El día del recambio, a la hora del check-in, el huésped anterior todavía no salió.
      await atHotel('2026-11-03', '16:00');
      const blocked = await request(app).post(`/api/reservations/${next.id}/check-in`).set(auth());
      expect(blocked.status).toBe(400);
      expect(blocked.body.error).toBe('Habitación ocupada');
      await next.reload();
      expect(next.status).toBe(ReservationStatus.PENDING);

      await request(app).post(`/api/reservations/${previous.id}/check-out`).set(auth()).send({late: true});
      const allowed = await request(app).post(`/api/reservations/${next.id}/check-in`).set(auth());
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

  // Regla de negocio: check-in desde las 15:00 del día de inicio, check-out hasta las 10:00
  // del día de salida, en la hora de Argentina. Fuera de horario el staff puede confirmarlo.
  describe('check-in and check-out times', () => {
    useHotelClock();

    const post = (path: string, body: object = {}) => request(app).post(path).set('Authorization', `Bearer ${adminToken}`).send(body);

    // Reserva del 2026-11-01 al 2026-11-03, ya con check-in hecho.
    const checkedIn = async () => {
      const reservation = await createPendingReservation();
      await reservation.update({status: ReservationStatus.CHECKED_IN});
      await Room.update({status: RoomStatus.OCCUPIED}, {where: {id: reservation.roomId}});
      return reservation;
    };

    it('rejects a check-in before the first day of the stay', async () => {
      const reservation = await createPendingReservation();
      await atHotel('2026-10-31', '16:00');

      const res = await post(`/api/reservations/${reservation.id}/check-in`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Todavía no es el día del check-in');
    });

    it('asks to confirm a check-in before 15:00 of the first day, and accepts it confirmed', async () => {
      const reservation = await createPendingReservation();
      await atHotel('2026-11-01', '14:59');

      const early = await post(`/api/reservations/${reservation.id}/check-in`);
      expect(early.status).toBe(409);
      expect(early.body.code).toBe('EARLY_CHECK_IN');
      await reservation.reload();
      expect(reservation.status).toBe(ReservationStatus.PENDING);

      const confirmed = await post(`/api/reservations/${reservation.id}/check-in`, {early: true});
      expect(confirmed.status).toBe(200);
    });

    it.each([
      ['at 15:00 of the first day', '2026-11-01', '15:00'],
      ['a guest who arrives a day later', '2026-11-02', '09:00']
    ])('accepts the check-in of %s', async (_case, date, time) => {
      const reservation = await createPendingReservation();
      await atHotel(date, time);

      expect((await post(`/api/reservations/${reservation.id}/check-in`)).status).toBe(200);
    });

    it('rejects a check-in on the departure day: the stay is over', async () => {
      const reservation = await createPendingReservation();
      await atHotel('2026-11-03', '08:00');

      const res = await post(`/api/reservations/${reservation.id}/check-in`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('La estadía ya terminó');
    });

    it.each([
      ['an early departure', '2026-11-02', '18:00'],
      ['10:00 of the departure day', '2026-11-03', '10:00']
    ])('accepts the check-out of %s', async (_case, date, time) => {
      const reservation = await checkedIn();
      await atHotel(date, time);

      expect((await post(`/api/reservations/${reservation.id}/check-out`)).status).toBe(200);
    });

    it.each([
      ['after 10:00 of the departure day', '2026-11-03', '10:01'],
      ['the day after the departure', '2026-11-04', '09:00']
    ])('asks to confirm a check-out %s, and accepts it confirmed', async (_case, date, time) => {
      const reservation = await checkedIn();
      await atHotel(date, time);

      const late = await post(`/api/reservations/${reservation.id}/check-out`);
      expect(late.status).toBe(409);
      expect(late.body.code).toBe('LATE_CHECK_OUT');
      await reservation.reload();
      expect(reservation.status).toBe(ReservationStatus.CHECKED_IN);

      const confirmed = await post(`/api/reservations/${reservation.id}/check-out`, {late: true});
      expect(confirmed.status).toBe(200);
      expect((await Room.findByPk(reservation.roomId))?.status).toBe(RoomStatus.AVAILABLE);
    });
  });

  describe('deleting reservations, guests and users', () => {
    const del = (path: string) => request(app).delete(path).set('Authorization', `Bearer ${adminToken}`);

    // Un consumo de 2 unidades de un cupo de 10 (quedan 8 disponibles).
    const consume = async (reservationId: number) => {
      const amenity = await Amenity.create({name: 'Spa', description: null});
      const quota = await AmenityQuota.create({quantity: 10, available: 8, amenityId: amenity.id});
      await ReservationAmenity.create({quantity: 2, unitPrice: 5000, totalAmount: 10000, reservationId, quotaId: quota.id});
      return quota;
    };

    it('rejects deleting a stay in progress and leaves it untouched', async () => {
      const reservation = await createPendingReservation();
      await reservation.update({status: ReservationStatus.CHECKED_IN});

      const res = await del(`/api/reservations/${reservation.id}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('La estadía está en curso');
      expect(await Reservation.findByPk(reservation.id)).not.toBeNull();
    });

    // Regresión: los consumos se borraban en cascada sin devolver las unidades al cupo.
    it('deleting a pending reservation gives its amenity units back to the quota', async () => {
      const reservation = await createPendingReservation();
      const quota = await consume(reservation.id);

      expect((await del(`/api/reservations/${reservation.id}`)).status).toBe(204);

      await quota.reload();
      expect(quota.available).toBe(10);
      expect(await ReservationAmenity.count({where: {reservationId: reservation.id}})).toBe(0);
    });

    it('deleting a finished stay keeps its consumed units used', async () => {
      const reservation = await createPendingReservation();
      await reservation.update({status: ReservationStatus.CHECKED_OUT});
      const quota = await consume(reservation.id);

      expect((await del(`/api/reservations/${reservation.id}`)).status).toBe(204);

      await quota.reload();
      expect(quota.available).toBe(8);
    });

    it.each([
      ['pending', ReservationStatus.PENDING],
      ['in progress', ReservationStatus.CHECKED_IN]
    ])('a guest with a %s reservation cannot be deleted, as a guest or as a user', async (_case, status) => {
      const reservation = await createPendingReservation();
      await reservation.update({status});
      const guest = (await Guest.findByPk(reservation.guestId))!;

      const asGuest = await del(`/api/guests/${guest.id}`);
      expect(asGuest.status).toBe(409);
      expect(asGuest.body.error).toBe('El huésped tiene reservas activas');
      expect(asGuest.body.message).toContain(`#${reservation.id}`);

      const asUser = await del(`/api/users/${guest.userId}`);
      expect(asUser.status).toBe(409);

      expect(await Guest.findByPk(guest.id)).not.toBeNull();
      expect(await User.findByPk(guest.userId)).not.toBeNull();
    });

    it('a guest whose reservations are cancelled or finished can be deleted', async () => {
      const reservation = await createPendingReservation();
      await reservation.update({status: ReservationStatus.CHECKED_OUT});
      await Reservation.create({
        startDate: '2026-12-01',
        endDate: '2026-12-02',
        status: ReservationStatus.CANCELLED,
        totalAmount: 50000,
        guestId: reservation.guestId,
        roomId: reservation.roomId
      });

      expect((await del(`/api/guests/${reservation.guestId}`)).status).toBe(204);
      expect(await Guest.findByPk(reservation.guestId)).toBeNull();
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
      expect(res.body.reservation.totalAmount).toBe(150000); // 3 noches x 50000, el monto enviado se ignora
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

  // Regla de negocio: el check-out es hasta las 10:00 del último día y el check-in desde las
  // 15:00 del primer día, así que una estadía puede empezar el día en que termina otra.
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

    it('staff can book, or move a reservation to, a stay that touches another on the turnover day', async () => {
      const reservation = await createPendingReservation(); // 2026-11-01 -> 2026-11-03
      const staff = request(app);
      const auth = {Authorization: `Bearer ${adminToken}`};

      const next = await staff
        .post('/api/reservations')
        .set(auth)
        .send({guestId: reservation.guestId, roomId: reservation.roomId, startDate: '2026-11-03', endDate: '2026-11-04'});
      expect(next.status).toBe(201);

      const moved = await staff
        .put(`/api/reservations/${next.body.reservation.id}`)
        .set(auth)
        .send({startDate: '2026-11-03', endDate: '2026-11-06'});
      expect(moved.status).toBe(200);
    });

    it('a reservation takes one slot on each night of the stay, but not on its checkout day', async () => {
      const reservation = await createPendingReservation(); // 2026-11-01 -> 2026-11-03, la única habitación

      const res = await request(app).get('/api/pricing/quote').query({startDate: '2026-11-02', endDate: '2026-11-04'});

      expect(res.status).toBe(200);
      const [quote] = res.body;
      expect(quote.categoryId).toBe((await Room.findByPk(reservation.roomId))!.categoryId);
      expect(quote.nights.map((night: {date: string; occupancy: number}) => [night.date, night.occupancy])).toEqual([
        ['2026-11-02', 100],
        ['2026-11-03', 0]
      ]);
    });
  });

  // Los servicios se cobran por día de estadía: cantidad x precio x noches.
  describe('amenities charged per night', () => {
    const auth = () => ({Authorization: `Bearer ${adminToken}`});

    const spaQuota = async () => {
      const amenity = await Amenity.create({name: 'Spa', description: null});
      return AmenityQuota.create({quantity: 10, available: 10, amenityId: amenity.id});
    };

    it('multiplies the amount by the nights of the stay, and takes the units once from the quota', async () => {
      const reservation = await createPendingReservation(); // 2 noches
      const quota = await spaQuota();

      const res = await request(app)
        .post('/api/reservation-amenities')
        .set(auth())
        .send({reservationId: reservation.id, quotaId: quota.id, quantity: 2, unitPrice: 5000});

      expect(res.status).toBe(201);
      expect(Number(res.body.totalAmount)).toBe(20000); // 2 x 5000 x 2 noches
      await quota.reload();
      expect(quota.available).toBe(8);
    });

    it('recomputes the amount when the quantity changes', async () => {
      const reservation = await createPendingReservation();
      const quota = await spaQuota();
      const created = await request(app)
        .post('/api/reservation-amenities')
        .set(auth())
        .send({reservationId: reservation.id, quotaId: quota.id, quantity: 1, unitPrice: 5000});

      const res = await request(app).put(`/api/reservation-amenities/${created.body.id}`).set(auth()).send({quantity: 3});

      expect(Number(res.body.totalAmount)).toBe(30000); // 3 x 5000 x 2 noches
    });

    it('reprices the consumptions when the stay changes length', async () => {
      const reservation = await createPendingReservation();
      const quota = await spaQuota();
      const created = await request(app)
        .post('/api/reservation-amenities')
        .set(auth())
        .send({reservationId: reservation.id, quotaId: quota.id, quantity: 1, unitPrice: 5000});

      const res = await request(app).put(`/api/reservations/${reservation.id}`).set(auth()).send({endDate: '2026-11-05'});

      expect(res.status).toBe(200);
      const consumption = await ReservationAmenity.findByPk(created.body.id);
      expect(Number(consumption!.totalAmount)).toBe(20000); // 1 x 5000 x 4 noches
    });

    it('rejects a consumption for a reservation that does not exist', async () => {
      const quota = await spaQuota();

      const res = await request(app)
        .post('/api/reservation-amenities')
        .set(auth())
        .send({reservationId: 9999, quotaId: quota.id, quantity: 1, unitPrice: 5000});

      expect(res.status).toBe(404);
      await quota.reload();
      expect(quota.available).toBe(10);
    });
  });
});
