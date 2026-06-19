# Provider Design

> Status: Phase 0 stub — implementation begins in Phase 2.

## ProviderAdapter interface

Every provider implements a single interface defined in `packages/providers/src/types.ts`:

```typescript
interface ProviderAdapter {
  readonly id: string;
  readonly name: string;
  listModels(): Promise<ModelInfo[]>;
  chat(request: ChatRequest): Promise<ChatResponse>;
  countTokens(messages: Message[]): Promise<number>;
  isAvailable(): Promise<boolean>;
}
```

API keys are injected at construction time via environment variables. They are never passed through `ChatRequest`.

## Adapters (v0.1)

| Adapter | Provider | SDK |
|---|---|---|
| `AnthropicAdapter` | Anthropic Claude | `@anthropic-ai/sdk` |
| `OpenAIAdapter` | OpenAI, OpenRouter, Azure | `openai` |
| `GeminiAdapter` | Google Gemini | `@google/generative-ai` |
| `OllamaAdapter` | Local Ollama | HTTP `localhost:11434` |
| `MockAdapter` | Test fixture | In-memory |

## Model metadata

Each provider has a JSON metadata file at `packages/providers/src/models/<provider>.json`:

```json
{
  "models": [
    {
      "id": "gemini-1.5-flash",
      "provider": "gemini",
      "contextWindow": 1000000,
      "inputCostPer1M": 0.075,
      "outputCostPer1M": 0.30,
      "capabilities": ["code", "json", "fast"],
      "maxOutputTokens": 8192
    }
  ]
}
```

Users can override pricing in `.agentforge/config.json` under `models.overrides`.

## ProviderRegistry

`packages/providers/src/registry.ts` is the runtime store. It aggregates all registered adapters and exposes `getAllModels()` — the feed used by the model router to score candidates across all providers.

## Key security rule

API keys are read from environment variables only:
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `OPENROUTER_API_KEY`
- `OLLAMA_ENDPOINT` (no key — just endpoint)

Keys are never written to `.agentforge/config.json`, SQLite, or logs.
