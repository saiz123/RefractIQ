# RefractIQ — CLAUDE.md

## What this is

RefractIQ is an open-source self-hosted AI software team platform. Users register API keys for multiple AI providers (Anthropic, OpenAI, Google Gemini, Ollama). The system routes each agent task to the cheapest capable model across all registered providers and builds software through a structured artifact pipeline.

## Monorepo structure

```
packages/   shared libraries — no CLI or HTTP concerns
apps/cli/   Commander.js CLI (primary user interface)
apps/web/   Next.js dashboard
services/   HTTP API + worker
docs/       architecture documentation
tests/e2e/  end-to-end tests using MockAdapter (zero real API calls)
```

## Core design constraints

**These must not be violated:**

1. Agents never call each other. The orchestrator controls all handoffs via structured JSON artifacts: `requirements.json` → `architecture.json` → `task-list.json` → `context-pack.json` + `code-diff` → `test-result.json` → `review.json` → `final-report.md`.

2. API keys are never stored in `.RefractIQ/config.json`, SQLite, or log files. Keys come from environment variables or `.env` only. The `SecretRedactor` in `packages/shared` strips known key patterns from all log output.

3. The context-engine never sends the full repo. It scores files for relevance and returns only the top-K chunks within a token budget cap.

4. Every model call must be tracked in SQLite (`run_stages`, `model_calls` tables) — provider, model, input tokens, output tokens, cache tokens, USD cost, latency.

5. The repair loop is capped at 3 iterations (configurable). After the cap is hit, the orchestrator records the failure and exits.

## Package build order

Build packages in this dependency order:

1. `packages/shared` — types, errors, logger, config (no workspace deps)
2. `packages/providers` — adapters (depends on: shared)
3. `packages/token-engine` — counting, budgets (depends on: shared)
4. `packages/cost-engine` — USD calc (depends on: shared)
5. `packages/model-router` — cross-provider selection (depends on: providers, token-engine, cost-engine)
6. `packages/context-engine` — file pruning (depends on: shared)
7. `packages/workspace-engine` — files/git/shell (depends on: shared)
8. `packages/evaluator` — test runner (depends on: shared)
9. `packages/orchestrator` — pipeline (depends on: all above)
10. `apps/cli` — commands (depends on: orchestrator, shared)

## Development commands

```bash
pnpm install                                   # install all workspace deps
pnpm build                                     # build all packages (topological order)
pnpm test                                      # run all tests with Vitest
pnpm lint                                      # ESLint all TypeScript files
pnpm typecheck                                 # tsc --noEmit across all packages
pnpm format                                    # Prettier format
pnpm --filter @RefractIQ/providers test       # test a single package
```

## Key types (single source of truth in packages/shared)

All artifact types live in `packages/shared/src/types/`. Do not define artifact shapes elsewhere.

## Security rules

- Never add `API_KEY` values to any file that might be committed
- Never log `request.headers`, raw provider responses, or env vars without redaction
- `CommandRunner` in `workspace-engine` must validate against the allowlist before exec
- `Workspace.writeFile()` must validate path is within `rootDir` before any I/O
