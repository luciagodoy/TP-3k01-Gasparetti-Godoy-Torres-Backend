import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret'
    },
    hookTimeout: 20000,
    setupFiles: ['./src/test/setup.ts']
  }
});
