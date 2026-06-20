# RefractIQ v0.1.0-alpha — Release Notes

**Release:** v0.1.0-alpha  
**Date:** June 2026  
**Status:** Alpha — not production-ready. Security and E2E hardening in progress.

---

## What's Included

### Core Pipeline
- 9-stage orchestrator: Intake → Architecture → Task Breakdown → Build → Test → Review → Repair (×3 max) → Documentation → Report
- Agents communicate through structured JSON artifacts only — no free-form chat
- Repair loop capped at 3 iterations with budget abort

### Provider System
- **Anthropic Claude** — Sonnet, Haiku (prompt caching supported)
- **OpenAI** — GPT-4o, GPT-4o-mini, o4-mini
- **Google Gemini** — Gemini 1.5 Flash (cheap), Pro
- **OpenRouter** — 100+ models via single key
- **Ollama** — local models, zero cost
- **Custom OpenAI-compatible** — Azure, vLLM, LM Studio

### Cross-Provider Model Router
- Routes each agent role to the cheapest capable model across all registered providers
- Reviewer uses a different provider from Builder for genuine second-opinion review
- Pre-filters candidates by capability, context window, and remaining budget

### Token Optimization
- Context engine: file relevance scoring, chunking at function boundaries, summarization cache
- Diff-only review (60–90% fewer review tokens)
- 3-layer budget enforcement: per-call token cap → per-stage USD limit → per-run abort
- Prompt cache layout for Anthropic and OpenAI

### Security
- API keys read from env vars only — never stored in config or SQLite
- Secret redaction on all log output including structured data fields
- Sanitized child process environment (API keys stripped before running project commands)
- Path traversal prevention on all workspace file operations
- Command allowlist before execution; shell metacharacter blocking
- Git commands use execFileSync with argument arrays (no shell interpolation)

### CLI
- `RefractIQ init` — creates `.RefractIQ/` with config and SQLite schema
- `RefractIQ providers add` — interactive provider registration
- `RefractIQ doctor` — validates provider health and connectivity
- `RefractIQ build "<idea>"` — runs full pipeline
- `RefractIQ plan "<idea>"` — planning only (intake + architecture)
- `RefractIQ report` — per-stage cost and token breakdown
- `RefractIQ serve` — starts Hono API for the web dashboard

### Web Dashboard
- Next.js 16 dashboard at `localhost:3000`
- Run history, per-stage cost breakdown, provider status

### Self-Hosting
- Docker Compose: `docker compose up` starts API + web dashboard
- CLI container for one-off builds: `docker compose run --rm cli build "..."`

---

## Known Limitations

- Command execution is allowlisted, not sandboxed
- Dry-run calls intake + architect (planning model calls still made)
- API has no auth by default — set `RefractIQ_API_TOKEN` for exposure beyond localhost
- Cloud provider E2E requires real API keys and may incur costs
- Provider model pricing is static in JSON config files

---

## Test Coverage

237 tests passing across 29 test files including:
- Security: path traversal, command injection, secret redaction, sanitized child env, git injection
- Provider: adapter interface, registry, mock pipeline E2E
- Router: cross-provider selection, budget filtering, second-opinion exclusion
- Token/cost: budget enforcement, cache layout, log compression
- Orchestrator: 9-stage pipeline, repair loop, budget abort, dry-run
- Workspace: file operations, git manager, delete safety

---

## Getting Started

```bash
git clone https://github.com/saiz123/RefractIQ.git
cd RefractIQ
pnpm install && pnpm build
cp .env.example .env
# Add your API keys to .env
node apps/cli/dist/bin/cli.js init
node apps/cli/dist/bin/cli.js providers add
node apps/cli/dist/bin/cli.js build "a CLI that reverses a string"
```

---

## Post-Release Roadmap

- **v0.2** — Prompt caching improvements, provider benchmarking, per-role model presets
- **v0.3** — Docker sandbox execution, provider latency tracking, patch preview before apply
- **v0.4** — Plugin system, MCP tool support, repo import mode

---

# RefractIQ v0.3.0 — Release Notes

**Release:** v0.3.0  
**Status:** Stable alpha

## What's New

### Docker Sandbox Execution (`--sandbox`)
Run generated test commands inside an isolated Docker container. No network access, memory-limited, auto-cleaned. Requires Docker installed on host.
```bash
refractiq build "my project" --sandbox
```

### File Content Preview (`--preview`)
The `--preview` flag now shows actual generated file content — not just file names. Review every line before committing to a build. Use `--preview-full` for complete files.

### Expanded Ollama Presets (14 models)
Added codellama, deepseek-coder, deepseek-coder-v2, qwen2.5-coder (7b/32b), phi3 (3.8b/14b), mistral, starcoder2, llama3.1 (8b/70b). All free, zero cost.

### Existing Project Mode (`--target-dir`)
Run RefractIQ on an existing codebase to add features or fix bugs:
```bash
refractiq build "add JWT authentication" --target-dir ./my-app
refractiq build "fix the memory leak in worker.ts" --patch
```
The context engine reads existing files and the builder agent patches only relevant files.

### Pre-generated Example Output
`examples/reverse-string-cli/output/` shows a complete real output from RefractIQ — TypeScript CLI, tests, and cost report. No API keys needed to see what RefractIQ produces.

## Test Coverage
245+ tests passing.

