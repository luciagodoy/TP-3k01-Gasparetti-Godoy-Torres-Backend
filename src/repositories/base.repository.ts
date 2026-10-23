import {Attributes, CreationAttributes, FindOptions, Model, ModelStatic, Transaction} from 'sequelize';

export interface WriteOptions {
  transaction?: Transaction;
}

// Contrato que cumple todo repositorio. Los servicios dependen de esta interfaz, no de
// Sequelize (Inversión de Dependencias)
export interface Repository<M extends Model> {
  findAll(options?: FindOptions<Attributes<M>>): Promise<M[]>;
  findById(id: number, options?: Omit<FindOptions<Attributes<M>>, 'where'>): Promise<M | null>;
  create(data: CreationAttributes<M>, options?: WriteOptions): Promise<M>;
  update(entity: M, data: Partial<Attributes<M>>, options?: WriteOptions): Promise<M>;
  delete(entity: M, options?: WriteOptions): Promise<void>;
}

export class BaseRepository<M extends Model> implements Repository<M> {
  constructor(protected readonly model: ModelStatic<M>) {}

  findAll(options?: FindOptions<Attributes<M>>): Promise<M[]> {
    return this.model.findAll(options);
  }

  findById(id: number, options?: Omit<FindOptions<Attributes<M>>, 'where'>): Promise<M | null> {
    return this.model.findByPk(id, options);
  }

  findOne(options: FindOptions<Attributes<M>>): Promise<M | null> {
    return this.model.findOne(options);
  }

  count(options?: FindOptions<Attributes<M>>): Promise<number> {
    return this.model.count(options);
  }

  create(data: CreationAttributes<M>, options?: WriteOptions): Promise<M> {
    return this.model.create(data, options);
  }

  update(entity: M, data: Partial<Attributes<M>>, options?: WriteOptions): Promise<M> {
    return entity.update(data, options);
  }

  delete(entity: M, options?: WriteOptions): Promise<void> {
    return entity.destroy(options);
  }
}
