import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: '.',
    testTimeout: 30000,
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/io/**', 'src/utils/**'],
      exclude: ['src/commands/**'],
    },
  },
});
