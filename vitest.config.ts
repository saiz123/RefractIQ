import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@refractiq/shared': resolve(__dirname, 'packages/shared/dist/index.js'),
      '@refractiq/providers': resolve(__dirname, 'packages/providers/dist/index.js'),
      '@refractiq/model-router': resolve(__dirname, 'packages/model-router/dist/index.js'),
      '@refractiq/token-engine': resolve(__dirname, 'packages/token-engine/dist/index.js'),
      '@refractiq/cost-engine': resolve(__dirname, 'packages/cost-engine/dist/index.js'),
      '@refractiq/context-engine': resolve(__dirname, 'packages/context-engine/dist/index.js'),
      '@refractiq/orchestrator': resolve(__dirname, 'packages/orchestrator/dist/index.js'),
      '@refractiq/workspace-engine': resolve(__dirname, 'packages/workspace-engine/dist/index.js'),
      '@refractiq/evaluator': resolve(__dirname, 'packages/evaluator/dist/index.js'),
    },
  },
  test: {
    include: [
      'packages/*/src/**/*.test.ts',
      'apps/*/src/**/*.test.ts',
      'tests/**/*.test.ts',
      'services/*/src/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts', 'apps/cli/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/dist/**'],
    },
  },
});
