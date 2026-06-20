# Provider Benchmarks

Expected cost ranges for a typical AgentForge build run. Estimates are based on model pricing as of mid-2026 and a "reverse a string CLI" sized project (~500 tokens input per stage, ~300 tokens output).

**AgentForge automatically routes to cheapest capable model per stage.** These tables show what to expect when mixing providers.

---

## Cost per stage per provider

| Stage | Default tier | Gemini 1.5 Flash | GPT-4o-mini | Claude Haiku | GPT-4o | Claude Sonnet |
|---|---|---|---|---|---|---|
| Intake | cheap | ~$0.001 | ~$0.001 | ~$0.002 | ~$0.004 | ~$0.004 |
| Architecture | mid | ~$0.003 | ~$0.004 | ~$0.005 | ~$0.010 | ~$0.012 |
| Build (per file) | strong | ~$0.005 | ~$0.008 | ~$0.008 | ~$0.018 | ~$0.020 |
| Review | mid | ~$0.002 | ~$0.003 | ~$0.004 | ~$0.008 | ~$0.010 |
| Documentation | cheap | ~$0.001 | ~$0.001 | ~$0.002 | ~$0.004 | ~$0.004 |

---

## Full run estimates (small project, 2–4 files)

| Strategy | Providers used | Estimated total cost |
|---|---|---|
| All cheapest (Gemini Flash only) | Gemini | ~$0.015–$0.030 |
| Mixed routing (recommended) | Gemini + Haiku + GPT-4o-mini | ~$0.025–$0.050 |
| Mixed routing (mid quality) | Gemini Flash + GPT-4o + Sonnet | ~$0.050–$0.100 |
| All strong models | Claude Sonnet / GPT-4o | ~$0.080–$0.150 |
| Local only (Ollama) | Ollama llama3.2 | ~$0.000 (hardware cost only) |

---

## Tips for minimizing cost

1. **Register multiple providers** — The model router automatically picks the cheapest capable model for each stage. More providers = more routing options.

2. **Use Ollama for development** — Free local inference for iterating on prompts and testing workflows before using cloud providers for final builds.

3. **Set a budget** — `agentforge build "..." --budget 0.05` aborts before exceeding $0.05. Useful for experiments.

4. **Let the router work** — The default tier assignments (cheap for Intake/Doc, mid for Architecture/Review, strong for Build/Repair) are tuned to minimize cost while maintaining quality.

5. **Dry-run first** — `agentforge build "..." --dry-run` runs only Intake + Architecture stages to verify the plan before spending on the full build.

---

## Provider input cost comparison (per 1M tokens, mid-2025 pricing)

| Provider | Model | Input $/1M | Output $/1M | Context window |
|---|---|---|---|---|
| Google | Gemini 1.5 Flash | $0.075 | $0.30 | 1M tokens |
| OpenAI | GPT-4o-mini | $0.15 | $0.60 | 128K tokens |
| Anthropic | Claude Haiku | $0.80 | $4.00 | 200K tokens |
| OpenAI | GPT-4o | $2.50 | $10.00 | 128K tokens |
| Anthropic | Claude Sonnet | $3.00 | $15.00 | 200K tokens |
| Ollama | llama3.2 (local) | $0.00 | $0.00 | 128K tokens |

*Prices change frequently. Update `packages/providers/src/models/*.json` when providers change pricing.*
