# Architecture

> Status: Phase 0 stub — will be expanded as phases are implemented.

## Overview

AgentForge is a monorepo of TypeScript packages. The CLI (`apps/cli`) is the primary user interface. All AI work flows through the `orchestrator`, which sequences agent stages, calls the `model-router` to select the cheapest capable provider/model for each stage, and passes structured JSON artifacts between stages.

## Package map

```
packages/shared          Types, errors, logger, config loader
packages/providers       Provider adapters (Anthropic, OpenAI, Gemini, Ollama, Mock)
packages/model-router    Cross-provider cheapest-model selection
packages/token-engine    Token counting, budget enforcement, cache layout
packages/cost-engine     USD cost calculation, run totals
packages/context-engine  File relevance scoring, chunking, diff extraction
packages/workspace-engine File I/O, Git, sandboxed command execution
packages/evaluator       Test runner, log compression
packages/orchestrator    Pipeline state machine, artifact handoffs
apps/cli                 Commander.js CLI
apps/web                 Next.js dashboard (Phase 9)
services/api             Hono HTTP API (Phase 9)
services/worker          Long-running worker (Phase 9)
```

## Pipeline stages

```
INTAKE         requirements.json
ARCHITECTURE   architecture.json
TASK BREAKDOWN task-list.json
BUILD          code-diff (per task)
TEST           test-result.json
REVIEW         review.json
REPAIR LOOP    code-diff (patch, max 3 iterations)
DOCUMENTATION  final-report.md
REPORT         SQLite + CLI summary
```

## Data flow

See the plan at `.claude/plans/you-are-helping-me-stateful-russell.md` for the full annotated data flow diagram.

## Artifact contracts

All artifact types are defined in `packages/shared/src/types/`. They are the single source of truth and must not be duplicated in other packages.
