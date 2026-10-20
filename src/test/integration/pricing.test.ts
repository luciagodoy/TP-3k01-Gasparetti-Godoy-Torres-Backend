import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
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

// "Today" for the lead time: 2026-10-20 in Argentina. Only Date is faked, so
// the timers supertest relies on keep working.
const TODAY = new Date('2026-10-20T15:00:00Z');

const login = async (username: string) => {
  const res = await request(app).post('/api/auth/login').send({username, password: 'clave123'});
  return res.body.token as string;
};

const createGuest = async () => {
  const province = await Province.create({name: 'Santa Fe'});
  const city = await City.create({name: 'Rosario', provinceId: province.id});
  const user = await User.create({username: 'guest1', email: 'guest1@example.com', password: 'clave123', role: Role.GUEST});
  return Guest.create({phone: null, documentNumber: '30111222', cityId: city.id, country: 'Argentina', userId: user.id});
};

// Standard: 2 rooms at 100 per night. Suite: 1 room at 200 per night.
const createHotel = async () => {
  const standard = await RoomCategory.create({name: 'Standard', capacity: 2, pricePerNight: 100});
  const suite = await RoomCategory.create({name: 'Suite', capacity: 2, pricePerNight: 200});
  const room1 = await Room.create({number: 101, floor: 1, status: RoomStatus.AVAILABLE, categoryId: standard.id});
  const room2 = await Room.create({number: 102, floor: 1, status: RoomStatus.AVAILABLE, categoryId: standard.id});
  const suiteRoom = await Room.create({number: 201, floor: 2, status: RoomStatus.AVAILABLE, categoryId: suite.id});
  return {standard, suite, room1, room2, suiteRoom};
};

const book = (guestId: number, roomId: number, startDate: string, endDate: string) =>
  Reservation.create({startDate, endDate, status: ReservationStatus.PENDING, totalAmount: 0, guestId, roomId});

const occupancyRule = (from: number, value: number, categoryId: number | null = null) =>
  PricingRule.create({type: PricingRuleType.OCCUPANCY, from, adjustmentType: AdjustmentType.PERCENTAGE, value, categoryId});

const quote = (query: Record<string, string | number>) => request(app).get('/api/pricing/quote').query(query);

describe('Dynamic pricing', () => {
  beforeEach(() => {
    vi.useFakeTimers({toFake: ['Date']});
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GET /api/pricing/quote', () => {
    it('without rules every night costs the base price of the category', async () => {
      const {standard} = await createHotel();

      const res = await quote({startDate: '2026-11-01', endDate: '2026-11-04', categoryId: standard.id});

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].total).toBe(300);
      expect(res.body[0].nights.map((night: {date: string}) => night.date)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
    });

    it('measures the occupancy of each night within the category', async () => {
      const guest = await createGuest();
      const {standard, suite, room1} = await createHotel();
      await book(guest.id, room1.id, '2026-11-02', '2026-11-03'); // 1 of 2 Standard rooms, night of 11-02 only
      await occupancyRule(50, 20);

      const res = await quote({startDate: '2026-11-01', endDate: '2026-11-04'});
      const standardQuote = res.body.find((q: {categoryId: number}) => q.categoryId === standard.id);
      const suiteQuote = res.body.find((q: {categoryId: number}) => q.categoryId === suite.id);

      expect(standardQuote.nights.map((night: {occupancy: number}) => night.occupancy)).toEqual([0, 50, 0]);
      expect(standardQuote.nights.map((night: {price: number}) => night.price)).toEqual([100, 120, 100]);
      expect(standardQuote.total).toBe(320);
      // A full Standard category does not make the Suite more expensive.
      expect(suiteQuote.total).toBe(600);
    });

    it('counts reservations that start before or end after the quoted range only on their nights inside it', async () => {
      const guest = await createGuest();
      const {standard, room1, room2} = await createHotel();
      await book(guest.id, room1.id, '2026-10-30', '2026-11-03'); // inside the range: nights of 11-01 and 11-02
      await book(guest.id, room2.id, '2026-11-02', '2026-11-06'); // inside the range: nights of 11-02 and 11-03

      const res = await quote({startDate: '2026-11-01', endDate: '2026-11-04', categoryId: standard.id});

      expect(res.body[0].nights.map((night: {occupancy: number}) => night.occupancy)).toEqual([50, 100, 50]);
    });

    it('does not count cancelled reservations as occupancy', async () => {
      const guest = await createGuest();
      const {standard, room1} = await createHotel();
      const reservation = await book(guest.id, room1.id, '2026-11-01', '2026-11-02');
      await reservation.update({status: ReservationStatus.CANCELLED});
      await occupancyRule(50, 20);

      const res = await quote({startDate: '2026-11-01', endDate: '2026-11-02', categoryId: standard.id});

      expect(res.body[0].total).toBe(100);
    });

    it('multiplies the occupancy and lead-time percentages', async () => {
      const guest = await createGuest();
      const {standard, room1} = await createHotel();
      await book(guest.id, room1.id, '2026-10-25', '2026-10-26');
      await occupancyRule(50, 20);
      // Today is 2026-10-20: a stay on 2026-10-25 is 5 days away.
      await PricingRule.create({type: PricingRuleType.LEAD_TIME, from: 0, to: 7, adjustmentType: AdjustmentType.PERCENTAGE, value: 10});

      const res = await quote({startDate: '2026-10-25', endDate: '2026-10-26', categoryId: standard.id});

      expect(res.body[0].leadDays).toBe(5);
      expect(res.body[0].total).toBe(132); // 100 x 1.20 x 1.10 (adding them would give 130)
    });

    it('a rule of the category wins over a global one', async () => {
      const guest = await createGuest();
      const {standard, room1} = await createHotel();
      await book(guest.id, room1.id, '2026-11-01', '2026-11-02');
      await occupancyRule(50, 20);
      await occupancyRule(50, 50, standard.id);

      const res = await quote({startDate: '2026-11-01', endDate: '2026-11-02', categoryId: standard.id});

      expect(res.body[0].total).toBe(150);
    });

    it('rejects a quote without dates, too long or for an unknown category', async () => {
      await createHotel();

      expect((await quote({startDate: '2026-11-01'})).status).toBe(400);
      expect((await quote({startDate: '2026-11-01', endDate: '2028-11-01'})).body.error).toBe('El rango de fechas es demasiado largo');
      expect((await quote({startDate: '2026-11-01', endDate: '2026-11-02', categoryId: 999})).status).toBe(404);
    });
  });

  describe('booking at the dynamic price', () => {
    it('the guest pays the quoted price, not the base price', async () => {
      const guest = await createGuest();
      const {room1, room2} = await createHotel();
      await book(guest.id, room1.id, '2026-11-01', '2026-11-03');
      await occupancyRule(50, 20);
      const token = await login('guest1');

      const res = await request(app)
        .post('/api/reservations/mine')
        .set('Authorization', `Bearer ${token}`)
        .send({roomId: room2.id, startDate: '2026-11-01', endDate: '2026-11-03', expectedTotal: 240});

      expect(res.status).toBe(201);
      expect(res.body.reservation.totalAmount).toBe(240);
    });

    it('if the price changed since the guest saw it, answers 409 and does not book', async () => {
      const guest = await createGuest();
      const {room1, room2} = await createHotel();
      await book(guest.id, room1.id, '2026-11-01', '2026-11-03');
      await occupancyRule(50, 20);
      const token = await login('guest1');

      const res = await request(app)
        .post('/api/reservations/mine')
        .set('Authorization', `Bearer ${token}`)
        .send({roomId: room2.id, startDate: '2026-11-01', endDate: '2026-11-03', expectedTotal: 200});

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('El precio cambió');
      expect(res.body.message).toContain('$240.00');
      expect(await Reservation.count({where: {roomId: room2.id}})).toBe(0);
    });

    it('an expectedTotal of null is treated as "not sent", not as a price of 0', async () => {
      await createGuest();
      const {room1} = await createHotel();
      const token = await login('guest1');

      const res = await request(app)
        .post('/api/reservations/mine')
        .set('Authorization', `Bearer ${token}`)
        .send({roomId: room1.id, startDate: '2026-11-01', endDate: '2026-11-02', expectedTotal: null});

      expect(res.status).toBe(201);
      expect(res.body.reservation.totalAmount).toBe(100);
    });

    it('a booked reservation keeps its price when the hotel fills up later', async () => {
      await createGuest();
      const {room1, room2} = await createHotel();
      await occupancyRule(50, 20);
      const token = await login('guest1');
      const first = await request(app)
        .post('/api/reservations/mine')
        .set('Authorization', `Bearer ${token}`)
        .send({roomId: room1.id, startDate: '2026-11-01', endDate: '2026-11-02'});

      await request(app)
        .post('/api/reservations/mine')
        .set('Authorization', `Bearer ${token}`)
        .send({roomId: room2.id, startDate: '2026-11-01', endDate: '2026-11-02'});

      const stored = await Reservation.findByPk(first.body.reservation.id);
      expect(stored?.totalAmount).toBe(100);
    });

    it('staff bookings without an amount use the dynamic price; with one, keep it', async () => {
      const guest = await createGuest();
      const {room1, room2} = await createHotel();
      await User.create({username: 'admin1', email: 'admin1@example.com', password: 'clave123', role: Role.ADMIN});
      await book(guest.id, room1.id, '2026-11-01', '2026-11-02');
      await occupancyRule(50, 20);
      const auth = {Authorization: `Bearer ${await login('admin1')}`};
      const stay = {guestId: guest.id, roomId: room2.id, startDate: '2026-11-01', endDate: '2026-11-02'};

      const quoted = await request(app).post('/api/reservations').set(auth).send(stay);
      expect(quoted.status).toBe(201);
      expect(quoted.body.reservation.totalAmount).toBe(120);

      await Reservation.destroy({where: {id: quoted.body.reservation.id}});
      const agreed = await request(app)
        .post('/api/reservations')
        .set(auth)
        .send({...stay, totalAmount: 90});
      expect(agreed.body.reservation.totalAmount).toBe(90);
    });
  });

  describe('/api/pricing-rules', () => {
    let auth: {Authorization: string};

    beforeEach(async () => {
      await User.create({username: 'admin1', email: 'admin1@example.com', password: 'clave123', role: Role.ADMIN});
      auth = {Authorization: `Bearer ${await login('admin1')}`};
    });

    const rule = (body: Record<string, unknown>) =>
      request(app)
        .post('/api/pricing-rules')
        .set(auth)
        .send({type: PricingRuleType.OCCUPANCY, adjustmentType: AdjustmentType.PERCENTAGE, value: 10, ...body});

    it('creates a tier and lists it', async () => {
      expect((await rule({from: 80})).status).toBe(201);

      const res = await request(app).get('/api/pricing-rules').set(auth);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].to).toBeNull();
    });

    it('rejects a tier that overlaps another of the same type and scope', async () => {
      await rule({from: 50, to: 80});

      const res = await rule({from: 70, to: 90});

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Ya existe una regla para ese rango');
    });

    it('allows the same range for a different category, or touching ranges', async () => {
      const category = await RoomCategory.create({name: 'Suite', capacity: 2, pricePerNight: 200});
      await rule({from: 50, to: 80});

      expect((await rule({from: 50, to: 80, categoryId: category.id})).status).toBe(201);
      expect((await rule({from: 80})).status).toBe(201); // [50, 80) and [80, ...) only touch
    });

    it('rejects invalid ranges and values', async () => {
      expect((await rule({from: 50, to: 50})).status).toBe(400);
      expect((await rule({from: 90, to: 120})).status).toBe(400); // occupancy above 100 %
      expect((await rule({from: 0, value: -100})).status).toBe(400); // free nights
      expect((await rule({from: 0, type: 'temporada'})).status).toBe(400);
    });

    it('validates an update against the stored values', async () => {
      const first = await rule({from: 50, to: 80});
      await rule({from: 80});

      const res = await request(app).put(`/api/pricing-rules/${first.body.id}`).set(auth).send({to: 90});

      expect(res.status).toBe(409);
    });

    // Regression: the foreign key was ON DELETE SET NULL, so deleting a category
    // turned its own rules (say +50 % for Suites) into global rules that priced
    // every other category.
    it('a category with its own rules cannot be deleted, and its rules stay its own', async () => {
      const category = await RoomCategory.create({name: 'Suite', capacity: 2, pricePerNight: 200});
      const created = await rule({from: 50, value: 50, categoryId: category.id});

      const res = await request(app).delete(`/api/room-categories/${category.id}`).set(auth);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No se puede eliminar el registro');
      expect((await PricingRule.findByPk(created.body.id))?.categoryId).toBe(category.id);
    });

    it('is staff only', async () => {
      await createGuest();
      const guestToken = await login('guest1');

      expect((await request(app).get('/api/pricing-rules')).status).toBe(401);
      expect((await request(app).get('/api/pricing-rules').set('Authorization', `Bearer ${guestToken}`)).status).toBe(403);
    });
  });
});
