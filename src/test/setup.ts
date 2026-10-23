import {beforeAll, afterAll, afterEach} from 'vitest';
import {sequelize} from '../config/database';
import '../entities';

beforeAll(async () => {
  await sequelize.sync({force: true});
});

afterEach(async () => {
  // Vaciar todas las tablas entre tests para que no compartan estado. Las claves foráneas
  // se apagan mientras tanto: todas las tablas terminan vacías igual, y con las RESTRICT
  // (reglas de tarifa -> categoría) el orden de los modelos importaría.
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
