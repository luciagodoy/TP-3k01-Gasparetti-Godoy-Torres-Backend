import {Transaction} from 'sequelize';
import {sequelize} from '../config/database';

// Managed transaction: commits when `work` resolves and rolls back when it
// throws, so services never call commit/rollback by hand. Lives in the data
// layer so services do not import the ORM connection.
export const runInTransaction = <T>(work: (transaction: Transaction) => Promise<T>): Promise<T> =>
  sequelize.transaction(work);
