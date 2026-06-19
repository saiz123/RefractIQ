import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@agentforge/shared': resolve(__dirname, 'packages/shared/dist/index.js'),
      '@agentforge/providers': resolve(__dirname, 'packages/providers/dist/index.js'),
      '@agentforge/model-router': resolve(__dirname, 'packages/model-router/dist/index.js'),
      '@agentforge/token-engine': resolve(__dirname, 'packages/token-engine/dist/index.js'),
      '@agentforge/cost-engine': resolve(__dirname, 'packages/cost-engine/dist/index.js'),
      '@agentforge/context-engine': resolve(__dirname, 'packages/context-engine/dist/index.js'),
      '@agentforge/orchestrator': resolve(__dirname, 'packages/orchestrator/dist/index.js'),
      '@agentforge/workspace-engine': resolve(__dirname, 'packages/workspace-engine/dist/index.js'),
      '@agentforge/evaluator': resolve(__dirname, 'packages/evaluator/dist/index.js'),
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
