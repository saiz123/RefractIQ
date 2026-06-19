# Contributing to AgentForge

AgentForge is open-source and welcomes contributions. Before contributing, please read this document and the [architecture docs](docs/architecture.md).

## Key design constraints

These are non-negotiable:

1. **Agents never communicate directly.** All handoffs go through the orchestrator via structured JSON artifacts.
2. **API keys never touch config files, SQLite, or logs.** Keys come from environment variables only.
3. **The context-engine never sends the full repo.** Always score and prune.
4. **Every model call is tracked** — provider, model, tokens, cost, latency — in SQLite.
5. **Provider logic stays in `packages/providers`.** No provider-specific code in the orchestrator or CLI.

## Setup

```bash
git clone https://github.com/your-username/agentforge
cd agentforge
pnpm install
pnpm build
pnpm test
```

## Before opening a PR

- `pnpm typecheck` — zero TypeScript errors
- `pnpm lint` — zero ESLint errors
- `pnpm test` — all tests pass
- New packages must have unit tests in `src/__tests__/`
- New provider adapters must have mock HTTP tests

## Package dependency order

When adding cross-package dependencies, respect the build order:

```
shared → providers → token-engine → cost-engine → model-router
       → context-engine
       → workspace-engine
       → evaluator
       → orchestrator → cli
```

## Adding a new provider

1. Add a new adapter in `packages/providers/src/adapters/<name>.ts` implementing `ProviderAdapter`
2. Add model metadata in `packages/providers/src/models/<name>.json`
3. Register in `packages/providers/src/registry.ts`
4. Add mock HTTP tests
5. Add to the `agentforge providers add` interactive prompt in `apps/cli/src/commands/providers.ts`
6. Document in `docs/provider-design.md`
