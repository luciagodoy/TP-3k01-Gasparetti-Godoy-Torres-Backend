import {Transaction} from 'sequelize';
import {Guest, Role} from '../entities';
import {guestRepository} from '../repositories/guest.repository';
import {reservationRepository} from '../repositories/reservation.repository';
import {runInTransaction} from '../repositories/transaction';
import {userRepository} from '../repositories/user.repository';
import {cityRepository} from '../repositories/city.repository';
import {normalizeEmail, trimmed, validateRegistration} from '../shared/account-rules';
import {BadRequestError, ConflictError, FieldErrors, InvalidFieldsError, NotFoundError} from '../shared/errors';
import {pickDefined} from '../shared/http';
import {BaseService} from './base.service';

export interface GuestRegistration {
  username: string;
  email: string;
  password: string;
  phone?: string | null;
  documentNumber: string;
  cityId: number;
  country?: string;
}

export interface GuestUpdate {
  phone?: string | null;
  documentNumber?: string;
  cityId?: number;
  country?: string;
}

const EDITABLE_FIELDS = ['phone', 'documentNumber', 'cityId', 'country'] as const;
const NO_PROFILE_MESSAGE = 'No existe un perfil de huésped asociado a esta cuenta';

class GuestService extends BaseService<Guest> {
  protected readonly notFoundMessage = 'Huésped no encontrado';
  protected readonly deleteBlockedMessage = 'Es posible que existan reservas asociadas a este huésped.';

  constructor(
    private readonly guests = guestRepository,
    private readonly users = userRepository
  ) {
    super(guests);
  }

  // Autoregistro: la cuenta y su perfil de huésped se crean juntos o no se crea ninguno.
  // Antes de escribir se valida cada campo, para responder con un mensaje por campo en vez
  // del error genérico de la base de datos.
  register(input: GuestRegistration): Promise<Guest> {
    const invalid = validateRegistration(input);
    if (Object.keys(invalid).length > 0) throw new InvalidFieldsError('Datos de registro inválidos', invalid);

    const username = trimmed(input.username);
    const email = normalizeEmail(input.email);
    const documentNumber = trimmed(input.documentNumber);

    return runInTransaction(async (transaction) => {
      const [sameUsername, sameEmail, sameDocument, city] = await Promise.all([
        this.users.findByUsername(username, transaction),
        this.users.findByEmail(email, transaction),
        this.guests.findByDocument(documentNumber, transaction),
        cityRepository.findById(Number(input.cityId), {transaction})
      ]);
      const taken: FieldErrors = {
        ...(sameUsername && {username: 'Ese nombre de usuario ya está en uso.'}),
        ...(sameEmail && {email: 'Ya existe una cuenta con ese email.'}),
        ...(sameDocument && {documentNumber: 'Ya hay un huésped registrado con ese documento.'})
      };
      if (Object.keys(taken).length > 0) throw new InvalidFieldsError('La cuenta ya existe', taken, 409);
      if (!city) throw new InvalidFieldsError('Datos de registro inválidos', {cityId: 'La ciudad elegida no existe.'});

      const user = await this.users.create({username, email, password: input.password, role: Role.GUEST}, {transaction});
      return this.guests.create(
        {
          phone: trimmed(input.phone) || null,
          documentNumber,
          cityId: city.id,
          country: trimmed(input.country) || 'Argentina',
          userId: user.id
        },
        {transaction}
      );
    });
  }

  list(): Promise<Guest[]> {
    return this.guests.findAllWithProfile();
  }

  async getWithProfile(id: number): Promise<Guest> {
    const guest = await this.guests.findByIdWithProfile(id);
    if (!guest) throw new NotFoundError(this.notFoundMessage);
    return guest;
  }

  async getProfileOfUser(userId: number): Promise<Guest> {
    const guest = await this.guests.findByUserIdWithProfile(userId);
    if (!guest) throw new NotFoundError(NO_PROFILE_MESSAGE);
    return guest;
  }

  // Lo usan los flujos de autoservicio: la cuenta logueada debe tener un perfil de huésped.
  async requireGuestIdOfUser(userId: number, transaction?: Transaction): Promise<number> {
    const guest = await this.guests.findByUserId(userId, transaction);
    if (!guest) throw new NotFoundError(NO_PROFILE_MESSAGE);
    return guest.id;
  }

  async update(id: number, input: GuestUpdate): Promise<Guest> {
    const guest = await this.getById(id);
    return this.guests.update(guest, pickDefined(input, EDITABLE_FIELDS));
  }

  // Borra la cuenta completa; el perfil de huésped se va con ella (ON DELETE CASCADE).
  async remove(id: number): Promise<void> {
    await runInTransaction(async (transaction) => {
      const guest = await this.guests.findById(id, {transaction});
      if (!guest) throw new NotFoundError(this.notFoundMessage);
      await this.assertNoActiveReservations(guest.id, transaction);
      const user = await this.users.findById(guest.userId, {transaction});
      if (!user) throw new BadRequestError('No se puede eliminar el huésped', 'La cuenta asociada no existe.');
      await this.users.delete(user, {transaction});
    });
  }

  // Con reservas pendientes o en curso no se borra: quedarían reservas sin huésped que
  // siguen bloqueando habitaciones, o una habitación ocupada sin nadie que haga el check-out.
  async assertNoActiveReservations(guestId: number, transaction: Transaction): Promise<void> {
    const active = await reservationRepository.findActiveByGuest(guestId, transaction);
    if (active.length === 0) return;
    const ids = active.map((reservation) => `#${reservation.id}`).join(', ');
    throw new ConflictError(
      'El huésped tiene reservas activas',
      `Reservas pendientes o en curso: ${ids}. Cancelalas o hacé el check-out antes de eliminarlo.`
    );
  }
}

export const guestService = new GuestService();
