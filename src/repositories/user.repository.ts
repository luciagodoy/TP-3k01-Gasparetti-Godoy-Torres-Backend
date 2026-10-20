import {Op} from 'sequelize';
import {User, Role} from '../entities';
import {BaseRepository} from './base.repository';

class UserRepository extends BaseRepository<User> {
  constructor() {
    super(User);
  }

  // Login accepts either the username or the email.
  findByUsernameOrEmail(identifier: string): Promise<User | null> {
    return this.findOne({where: {[Op.or]: [{username: identifier}, {email: identifier}]}});
  }

  findAnyAdmin(): Promise<User | null> {
    return this.findOne({where: {role: Role.ADMIN}});
  }
}

export const userRepository = new UserRepository();
