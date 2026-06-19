import type { ModelInfo, ChatRequest, ChatResponse, Message, ProviderConfig } from '@agentforge/shared';
import { ProviderError } from '@agentforge/shared';
import type { ProviderAdapter } from '../types.js';
import { loadOllamaModels } from '../modelLoader.js';

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

interface OllamaChatMessage {
  role: string;
  content: string;
}

interface OllamaChatResponse {
  model: string;
  message: OllamaChatMessage;
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaAdapter implements ProviderAdapter {
  readonly id = 'ollama';
  readonly name = 'Ollama';

  private endpoint: string;

  constructor(config?: ProviderConfig) {
    this.endpoint = config?.endpoint
      ?? process.env['OLLAMA_ENDPOINT']
      ?? 'http://localhost:11434';
  }

  async listModels(): Promise<ModelInfo[]> {
    const staticModels = loadOllamaModels();
    try {
      const response = await fetch(`${this.endpoint}/api/tags`);
      if (!response.ok) return staticModels;

      const data = (await response.json()) as OllamaTagsResponse;
      const runningNames = new Set(data.models.map((m) => m.name));

      // Merge: running models first, then static fallback for known models
      const runningModels: ModelInfo[] = data.models.map((m) => {
        const found = staticModels.find((s) => s.id === m.name);
        return (
          found ?? {
            id: m.name,
            provider: 'ollama',
            contextWindow: 4096,
            inputCostPer1M: 0,
            outputCostPer1M: 0,
            capabilities: ['code', 'json'] as ModelInfo['capabilities'],
            maxOutputTokens: 4096,
          }
        );
      });

      // Add static models not already covered by running models
      const extras = staticModels.filter((s) => !runningNames.has(s.id));
      return [...runningModels, ...extras];
    } catch {
      return staticModels;
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startMs = Date.now();

    const messages: OllamaChatMessage[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    for (const m of request.messages) {
      messages.push({ role: m.role, content: m.content });
    }

    const body = {
      model: request.model,
      messages,
      stream: false,
      options: {
        num_predict: request.maxTokens,
        ...(request.temperature !== undefined && { temperature: request.temperature }),
      },
    };

    let response: Response;
    try {
      response = await fetch(`${this.endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new ProviderError(
        `Ollama request failed: ${err instanceof Error ? err.message : String(err)}`,
        this.id,
      );
    }

    if (!response.ok) {
      throw new ProviderError(
        `Ollama returned HTTP ${response.status}`,
        this.id,
      );
    }

    const data = (await response.json()) as OllamaChatResponse;
    const latencyMs = Date.now() - startMs;

    return {
      content: data.message.content,
      inputTokens: data.prompt_eval_count ?? 0,
      outputTokens: data.eval_count ?? 0,
      model: data.model,
      provider: this.id,
      latencyMs,
    };
  }

  async countTokens(messages: Message[]): Promise<number> {
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
