import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret'
    },
    hookTimeout: 20000,
    // Sin esto, después de `npm run build` vitest levanta también los tests ya
    // compilados en dist/ (CommonJS) y fallan al importar vitest.
    exclude: ['**/node_modules/**', '**/dist/**'],
    setupFiles: ['./src/test/setup.ts']
  }
});
