# Development Guide

## Prerequisites

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- Git

## Setup

```bash
git clone https://github.com/your-username/RefractIQ
cd RefractIQ
pnpm install
pnpm build
pnpm test
```

## Commands

```bash
pnpm build                                  # build all packages (topological order)
pnpm test                                   # run all tests
pnpm test:watch                             # run tests in watch mode
pnpm test:coverage                          # run tests with coverage report
pnpm lint                                   # ESLint
pnpm format                                 # Prettier
pnpm typecheck                              # tsc --noEmit across all packages

# Single-package operations
pnpm --filter @RefractIQ/providers build
pnpm --filter @RefractIQ/providers test
pnpm --filter @RefractIQ/providers typecheck
```

## Package structure

Each package under `packages/` follows this layout:

```
packages/<name>/
  package.json      name, scripts, dependencies
  tsconfig.json     extends ../../tsconfig.base.json
  src/
    index.ts        public exports
    __tests__/      unit tests (co-located)
  dist/             compiled output (gitignored)
```

## Package dependency order

Implement packages in this order to avoid circular dependencies:

1. `packages/shared`
2. `packages/providers`
3. `packages/token-engine`
4. `packages/cost-engine`
5. `packages/model-router`
6. `packages/context-engine`
7. `packages/workspace-engine`
8. `packages/evaluator`
9. `packages/orchestrator`
10. `apps/cli`

## Adding a new package

```bash
mkdir packages/my-package
cd packages/my-package
cat > package.json << 'EOF'
{
  "name": "@RefractIQ/my-package",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } },
  "scripts": { "build": "tsc", "typecheck": "tsc --noEmit", "test": "vitest run" },
  "dependencies": { "@RefractIQ/shared": "workspace:*" }
}
EOF
mkdir src
echo 'export {};' > src/index.ts
```

## Testing with MockAdapter

All tests that exercise orchestrator or provider logic must use `MockAdapter` (no real API calls):

```typescript
import { MockAdapter } from '@RefractIQ/providers';

const provider = new MockAdapter({
  fixtures: [
    { match: { stage: 'intake' }, response: '{"clarifiedGoal":"..."}', inputTokens: 50 }
  ]
});
```

## Environment for local development

```bash
cp .env.example .env
# Fill in at least one real provider key for smoke tests
```

The `RefractIQ doctor` command validates all providers before a real build.
