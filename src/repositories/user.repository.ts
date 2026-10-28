import {Op, Transaction} from 'sequelize';
import {User, Role} from '../entities';
import {BaseRepository} from './base.repository';

class UserRepository extends BaseRepository<User> {
  constructor() {
    super(User);
  }

  // El registro guarda los emails en minúsculas; las cuentas viejas o creadas por el staff
  // pueden no estarlo, así que se prueba el email tal cual y en minúsculas.
  findByUsernameOrEmail(identifier: string): Promise<User | null> {
    const emails = [...new Set([identifier, identifier.toLowerCase()])];
    return this.findOne({where: {[Op.or]: [{username: identifier}, {email: {[Op.in]: emails}}]}});
  }

  findByUsername(username: string, transaction?: Transaction): Promise<User | null> {
    return this.findOne({where: {username}, attributes: ['id'], transaction});
  }

  findByEmail(email: string, transaction?: Transaction): Promise<User | null> {
    return this.findOne({where: {email}, attributes: ['id'], transaction});
  }

  findAnyAdmin(): Promise<User | null> {
    return this.findOne({where: {role: Role.ADMIN}});
  }
}

export const userRepository = new UserRepository();
