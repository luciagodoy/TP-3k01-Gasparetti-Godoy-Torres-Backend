import {beforeAll, afterAll, afterEach} from 'vitest';
import {sequelize} from '../config/database';
// Registers every entity and its associations (NODE_ENV=test -> in-memory SQLite).
import '../entities';

beforeAll(async () => {
  await sequelize.sync({force: true});
});

afterEach(async () => {
  // Empty every table between tests so they do not share state. Foreign keys
  // are off meanwhile: every table ends up empty anyway, and with RESTRICT ones
  // (pricing rules -> category) the order of the models would matter.
  await sequelize.query('PRAGMA foreign_keys = OFF');
  try {
    for (const model of Object.values(sequelize.models)) {
      await model.destroy({where: {}, truncate: true, force: true});
    }
  } finally {
    await sequelize.query('PRAGMA foreign_keys = ON');
  }
});

afterAll(async () => {
  await sequelize.close();
});
