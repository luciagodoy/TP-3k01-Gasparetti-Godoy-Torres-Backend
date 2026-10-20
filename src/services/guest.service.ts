import {Transaction} from 'sequelize';
import {Guest, Role} from '../entities';
import {guestRepository} from '../repositories/guest.repository';
import {runInTransaction} from '../repositories/transaction';
import {userRepository} from '../repositories/user.repository';
import {BadRequestError, NotFoundError} from '../shared/errors';
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

  // Self sign-up: the account and its guest profile are created together or not at all.
  register(input: GuestRegistration): Promise<Guest> {
    return runInTransaction(async (transaction) => {
      const user = await this.users.create(
        {username: input.username, email: input.email, password: input.password, role: Role.GUEST},
        {transaction}
      );
      return this.guests.create(
        {
          phone: input.phone ?? null,
          documentNumber: input.documentNumber,
          cityId: input.cityId,
          country: input.country || 'Argentina',
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

  // Used by the self-service flows: the logged-in account must have a guest profile.
  async requireGuestIdOfUser(userId: number, transaction?: Transaction): Promise<number> {
    const guest = await this.guests.findByUserId(userId, transaction);
    if (!guest) throw new NotFoundError(NO_PROFILE_MESSAGE);
    return guest.id;
  }

  async update(id: number, input: GuestUpdate): Promise<Guest> {
    const guest = await this.getById(id);
    return this.guests.update(guest, pickDefined(input, EDITABLE_FIELDS));
  }

  // Deletes the whole account; the guest profile goes with it (ON DELETE CASCADE).
  async remove(id: number): Promise<void> {
    const guest = await this.getById(id);
    const user = await this.users.findById(guest.userId);
    if (!user) throw new BadRequestError('No se puede eliminar el huésped', 'La cuenta asociada no existe.');
    await this.users.delete(user);
  }
}

export const guestService = new GuestService();
