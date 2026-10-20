import {Attributes, FindOptions, ForeignKeyConstraintError, Model} from 'sequelize';
import {Repository, WriteOptions} from '../repositories/base.repository';
import {BadRequestError, NotFoundError} from '../shared/errors';

// Behaviour shared by every entity service: fetching by id with a 404, and
// deleting with a clear message when related rows prevent it.
export abstract class BaseService<M extends Model> {
  protected abstract readonly notFoundMessage: string;
  protected abstract readonly deleteBlockedMessage: string;

  // Depends on the Repository interface, not on a concrete class or the ORM.
  constructor(protected readonly repository: Repository<M>) {}

  async getById(id: number, options?: Omit<FindOptions<Attributes<M>>, 'where'>): Promise<M> {
    const entity = await this.repository.findById(id, options);
    if (!entity) throw new NotFoundError(this.notFoundMessage);
    return entity;
  }

  async remove(id: number, options?: WriteOptions): Promise<void> {
    const entity = await this.getById(id);
    try {
      await this.repository.delete(entity, options);
    } catch (error) {
      if (error instanceof ForeignKeyConstraintError) {
        throw new BadRequestError('No se puede eliminar el registro', this.deleteBlockedMessage);
      }
      throw error;
    }
  }
}
