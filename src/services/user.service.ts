import {User, Role} from '../entities';
import {guestRepository} from '../repositories/guest.repository';
import {runInTransaction} from '../repositories/transaction';
import {userRepository} from '../repositories/user.repository';
import {BadRequestError, NotFoundError} from '../shared/errors';
import {pickDefined} from '../shared/http';
import {BaseService} from './base.service';
import {guestService} from './guest.service';

export interface UserInput {
  username: string;
  email: string;
  password: string;
  role?: Role;
}

const EDITABLE_FIELDS = ['username', 'email', 'password', 'role'] as const;

class UserService extends BaseService<User> {
  protected readonly notFoundMessage = 'Usuario no encontrado';
  protected readonly deleteBlockedMessage = 'El usuario tiene registros asociados.';

  list(): Promise<User[]> {
    return this.repository.findAll();
  }

  create(input: UserInput): Promise<User> {
    if (!input.username || !input.email || !input.password) {
      throw new BadRequestError('username, email y password son requeridos');
    }
    return this.repository.create({
      username: input.username,
      email: input.email,
      password: input.password,
      role: input.role ?? Role.GUEST
    });
  }

  async update(id: number, input: Partial<UserInput>): Promise<User> {
    const user = await this.getById(id);
    // La contraseña se hashea en el hook beforeSave de la entidad.
    return this.repository.update(user, pickDefined(input, EDITABLE_FIELDS));
  }

  // Borrar la cuenta borra su perfil de huésped: se aplica la misma regla que al borrar el huésped.
  async remove(id: number): Promise<void> {
    await runInTransaction(async (transaction) => {
      const user = await this.repository.findById(id, {transaction});
      if (!user) throw new NotFoundError(this.notFoundMessage);
      const guest = await guestRepository.findByUserId(user.id, transaction);
      if (guest) await guestService.assertNoActiveReservations(guest.id, transaction);
      await this.repository.delete(user, {transaction});
    });
  }
}

export const userService = new UserService(userRepository);
