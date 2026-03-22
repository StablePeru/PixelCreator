import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: '.',
    testTimeout: 30_000,
    include: ['test/**/*.test.ts'],
    coverage: {
      include: ['src/core/**', 'src/io/**', 'src/utils/**'],
      provider: 'v8',
    },
  },
});
