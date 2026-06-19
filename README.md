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

**v0.1 — under active development.**

| Phase | Status | Description |
|---|---|---|
| 0 — Scaffold | ✅ Done | Monorepo structure, tooling, docs |
| 1 — CLI Skeleton | 🔜 Next | Commander.js commands, `agentforge init` |
| 2 — Provider Interface | ⬜ | Adapters for Anthropic, OpenAI, Gemini, Ollama |
| 3 — Model Router | ⬜ | Cross-provider cheapest-model selection |
| 4 — Token/Cost Engine | ⬜ | Budget enforcement, USD tracking |
| 5 — Orchestrator | ⬜ | Pipeline state machine, artifact handoffs |
| 6 — Context Engine | ⬜ | File relevance scoring, repo pruning |
| 7 — Workspace Engine | ⬜ | File I/O, Git, sandboxed commands |
| 8 — Real Build | ⬜ | End-to-end working `agentforge build` |
| 9 — Web Dashboard | ⬜ | Next.js UI, run history, cost charts |
| 10 — Docker | ⬜ | Full Docker Compose self-hosting |

## Requirements

- Node.js 20+
- pnpm 9+
- At least one AI provider API key

## Quick start

```bash
git clone https://github.com/your-username/agentforge
cd agentforge
pnpm install
cp .env.example .env
# Add your API keys to .env

pnpm build
pnpm agentforge init
pnpm agentforge providers add
pnpm agentforge doctor
pnpm agentforge build "a CLI that reverses a string"
pnpm agentforge report
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
