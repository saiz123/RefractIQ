# Self-Hosting AgentForge

AgentForge is designed to run entirely on your own machine or server. No cloud account required.

## Option 1 — Local (recommended for development)

### Prerequisites
- Node.js 20+
- pnpm 9+

### Steps

1. **Clone and install**
   ```bash
   git clone https://github.com/your-username/agentforge
   cd agentforge
   pnpm install
   pnpm build
   ```

2. **Configure**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

3. **Initialize**
   ```bash
   node apps/cli/dist/bin/cli.js init
   node apps/cli/dist/bin/cli.js providers add
   node apps/cli/dist/bin/cli.js doctor
   ```

4. **Build something**
   ```bash
   node apps/cli/dist/bin/cli.js build "a CLI that reverses a string"
   node apps/cli/dist/bin/cli.js report
   ```

5. **Launch dashboard** (optional)
   ```bash
   node apps/cli/dist/bin/cli.js serve   # API on :3001
   pnpm --filter @agentforge/web dev      # UI on :3000
   ```

---

## Option 2 — Docker Compose (recommended for self-hosting)

### Prerequisites
- Docker Engine 24+
- Docker Compose v2

### Steps

1. **Clone**
   ```bash
   git clone https://github.com/your-username/agentforge
   cd agentforge
   ```

2. **Configure**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

3. **Initialize the database** (first run only)
   ```bash
   docker compose run --rm cli init
   docker compose run --rm cli providers add
   ```

4. **Start services**
   ```bash
   docker compose up -d
   ```

5. **Open the dashboard**
   - Web UI: http://localhost:3000
   - API:    http://localhost:3001/api/health

6. **Run a build**
   ```bash
   docker compose run --rm cli build "a CLI that reverses a string"
   docker compose run --rm cli report
   ```

### Data persistence

All AgentForge state is stored in the `agentforge_data` Docker volume:
- `.agentforge/config.json` — provider configs, budget settings
- `.agentforge/agentforge.db` — run history, cost tracking

Generated output files are mounted at `./output/` on your host machine.

### Port configuration

Override default ports via `.env`:
```
API_PORT=3001
WEB_PORT=3000
```

### Updating

```bash
git pull
docker compose build
docker compose up -d
```

### Stopping

```bash
docker compose down        # stop containers
docker compose down -v     # stop + delete all data (irreversible)
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | If using Anthropic | Claude models |
| `OPENAI_API_KEY` | If using OpenAI | GPT / o-series models |
| `GEMINI_API_KEY` | If using Gemini | Gemini Flash / Pro |
| `OPENROUTER_API_KEY` | If using OpenRouter | Multi-provider routing |
| `OLLAMA_ENDPOINT` | If using Ollama | Default: `http://localhost:11434` |
| `AGENTFORGE_DEFAULT_BUDGET_USD` | No | Default per-run budget (default: `0.50`) |
| `AGENTFORGE_LOG_LEVEL` | No | `silent\|error\|warn\|info\|debug` (default: `info`) |
| `API_PORT` | No | API server port (default: `3001`) |
| `WEB_PORT` | No | Web dashboard port (default: `3000`) |
