import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: '.',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/io/**', 'src/utils/**'],
      exclude: ['src/commands/**'],
    },
  },
});
