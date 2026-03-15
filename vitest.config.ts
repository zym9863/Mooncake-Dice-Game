import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['server/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['server/src/**/*.ts', 'shared/**/*.ts'],
      exclude: [
        'server/src/index.ts',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/__tests__/**',
        'server/dist/**',
        'dist/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 75,
      },
    },
  },
})
