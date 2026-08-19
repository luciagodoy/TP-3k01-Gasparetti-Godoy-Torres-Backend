import { beforeAll, afterAll, afterEach } from 'vitest';
import { sequelize } from '../config/database';
import './registerModels';

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterEach(async () => {
  // Vacía todas las tablas entre tests para que no compartan estado.
  const models = Object.values(sequelize.models);
  for (const model of models) {
    await model.destroy({ where: {}, truncate: true, force: true });
  }
});

afterAll(async () => {
  await sequelize.close();
});
