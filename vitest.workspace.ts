import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      include: ['packages/**/*.test.ts'],
      exclude: ['**/*.integration.test.ts', '**/node_modules/**'],
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'integration',
      include: ['**/*.integration.test.ts', 'apps/api/**/*.test.ts'],
      globalSetup: './tests/setup/global-setup.ts',
      poolOptions: {
        threads: {
          singleThread: true,
        },
      },
    },
  },
]);
