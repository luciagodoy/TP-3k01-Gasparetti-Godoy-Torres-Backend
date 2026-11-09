import {Transaction} from 'sequelize';
import {City, Guest, Province, Role, User} from '../entities';
import {BaseRepository} from './base.repository';

const userWithoutPassword = {model: User, as: 'user', attributes: {exclude: ['password']}};
const cityWithProvince = {model: City, as: 'city', include: [{model: Province, as: 'province'}]};
const profile = [userWithoutPassword, cityWithProvince];

class GuestRepository extends BaseRepository<Guest> {
  constructor() {
    super(Guest);
  }

  // Sólo los perfiles cuya cuenta todavía tiene el rol de huésped.
  findAllWithProfile(): Promise<Guest[]> {
    return this.findAll({include: [{...userWithoutPassword, where: {role: Role.GUEST}}, cityWithProvince]});
  }

  findByIdWithProfile(id: number): Promise<Guest | null> {
    return this.findById(id, {include: profile});
  }

  findByUserId(userId: number, transaction?: Transaction): Promise<Guest | null> {
    return this.findOne({where: {userId}, transaction});
  }

  findByDocument(documentNumber: string, transaction?: Transaction): Promise<Guest | null> {
    return this.findOne({where: {documentNumber}, attributes: ['id'], transaction});
  }

  findByUserIdWithProfile(userId: number): Promise<Guest | null> {
    return this.findOne({where: {userId}, include: profile});
  }
}

export const guestRepository = new GuestRepository();
