import {Attributes, FindOptions, ForeignKeyConstraintError, Model} from 'sequelize';
import {Repository} from '../repositories/base.repository';
import {BadRequestError, NotFoundError} from '../shared/errors';
export abstract class BaseService<M extends Model> {
  protected abstract readonly notFoundMessage: string;
  // Explica por qué el remove() de esta clase no pudo borrar (otro registro depende de este).
  // Cada servicio lo redefine con su caso; los que sobrescriben remove() no lo usan.
  protected readonly deleteBlockedMessage: string = 'Hay otros registros que dependen de este.';
  constructor(protected readonly repository: Repository<M>) {}

  async getById(id: number, options?: Omit<FindOptions<Attributes<M>>, 'where'>): Promise<M> {
    const entity = await this.repository.findById(id, options);
    if (!entity) throw new NotFoundError(this.notFoundMessage);
    return entity;
  }

  async remove(id: number): Promise<void> {
    const entity = await this.getById(id);
    try {
      await this.repository.delete(entity);
    } catch (error) {
      if (error instanceof ForeignKeyConstraintError) {
        throw new BadRequestError('No se puede eliminar el registro', this.deleteBlockedMessage);
      }
      throw error;
    }
  }
}
