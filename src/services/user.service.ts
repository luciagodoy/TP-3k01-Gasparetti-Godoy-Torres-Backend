import {User, Role} from '../entities';
import {userRepository} from '../repositories/user.repository';
import {BadRequestError} from '../shared/errors';
import {pickDefined} from '../shared/http';
import {BaseService} from './base.service';

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
    // The password is hashed by the entity's beforeSave hook.
    return this.repository.update(user, pickDefined(input, EDITABLE_FIELDS));
  }
}

export const userService = new UserService(userRepository);
