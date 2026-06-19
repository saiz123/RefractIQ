# AgentForge

Open-source, self-hosted AI software team platform.

Connect your own API keys from Anthropic, OpenAI, Google Gemini, and Ollama. Role-based agents — Intake, Architect, Builder, Reviewer, Documentation — work through a structured pipeline, each running on the cheapest capable model across all your registered providers.

## Core idea

You already pay for multiple AI subscriptions. AgentForge routes each task to the cheapest capable model across all of them:

- **Intake → Gemini Flash** (cheap, fast, structured extraction)
- **Architecture → Claude Sonnet** (strong reasoning, no code context needed)
- **Build → GPT-4o** (strong coding)
- **Review → Claude Haiku** (different provider from Builder — genuine second opinion)
- **Documentation → Gemini Flash** (cheap, template-like output)

Agents communicate through structured JSON artifacts only. No free-form agent chat. An orchestrator controls all handoffs and enforces token budgets.

## Status

**v0.1 — complete and working.**

| Phase | Status | Description |
|---|---|---|
| 0 — Scaffold | ✅ Done | Monorepo structure, tooling, docs |
| 1 — CLI Skeleton | ✅ Done | Commander.js commands, `agentforge init` |
| 2 — Provider Interface | ✅ Done | Adapters for Anthropic, OpenAI, Gemini, Ollama |
| 3 — Model Router | ✅ Done | Cross-provider cheapest-model selection |
| 4 — Token/Cost Engine | ✅ Done | Budget enforcement, USD tracking |
| 5 — Orchestrator | ✅ Done | Pipeline state machine, artifact handoffs |
| 6 — Context Engine | ✅ Done | File relevance scoring, repo pruning |
| 7 — Workspace Engine | ✅ Done | File I/O, Git, sandboxed commands |
| 8 — Real Build | ✅ Done | End-to-end working `agentforge build` |
| 9 — Web Dashboard | ✅ Done | Next.js UI, run history, cost charts |
| 10 — Docker | ✅ Done | Full Docker Compose self-hosting |

218 tests passing across 26 test files.

## Requirements

- Node.js 20+
- pnpm 9+
- At least one AI provider API key

## Quick start

```bash
git clone https://github.com/saiz123/AgentForge.git
cd AgentForge
pnpm install
pnpm build

cp .env.example .env
# Add your API keys to .env

node apps/cli/dist/bin/cli.js init
node apps/cli/dist/bin/cli.js providers add
node apps/cli/dist/bin/cli.js doctor
node apps/cli/dist/bin/cli.js build "a CLI that reverses a string"
node apps/cli/dist/bin/cli.js report
```

### Web dashboard

```bash
node apps/cli/dist/bin/cli.js serve   # API on http://localhost:3001
pnpm --filter @agentforge/web dev     # UI on http://localhost:3000
```

### Docker (self-hosted)

```bash
cp .env.example .env
# Add your API keys to .env

docker compose run --rm cli init
docker compose run --rm cli providers add
docker compose up -d

# Web UI at http://localhost:3000
# Then run builds with:
docker compose run --rm cli build "a CLI that reverses a string"
```

## Documentation

- [Architecture](docs/architecture.md) — system design and data flow
- [Provider Design](docs/provider-design.md) — adapter interface and model metadata
- [Token Optimization](docs/token-optimization.md) — how cost is minimized
- [Security](docs/security.md) — key handling, sandboxing, secret redaction
- [Self-Hosting](docs/self-hosting.md) — Docker Compose setup
- [Development](docs/development.md) — how to contribute and extend AgentForge

## License

MIT — see [LICENSE](LICENSE).
