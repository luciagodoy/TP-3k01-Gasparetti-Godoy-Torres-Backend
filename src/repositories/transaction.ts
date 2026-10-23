import {Transaction} from 'sequelize';
import {sequelize} from '../config/database';

// Transacción administrada: confirma cuando `work` se resuelve y hace rollback cuando
// lanza un error, así los servicios nunca llaman a commit/rollback a mano. Vive en la
// capa de datos para que los servicios no importen la conexión del ORM.
export const runInTransaction = <T>(work: (transaction: Transaction) => Promise<T>): Promise<T> =>
  sequelize.transaction(work);
