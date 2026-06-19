import type {
  ModelInfo,
  ChatRequest,
  ChatResponse,
  Message,
  ProviderConfig,
} from '@agentforge/shared';
import { ProviderError } from '@agentforge/shared';
import type { ProviderAdapter } from '../types.js';
import { loadOpenRouterModels } from '../modelLoader.js';

export class OpenRouterAdapter implements ProviderAdapter {
  readonly id = 'openrouter';
  readonly name = 'OpenRouter';
  private apiKey: string | undefined;
  private endpoint: string;

  constructor(config?: ProviderConfig) {
    this.apiKey = process.env['OPENROUTER_API_KEY'];
    this.endpoint = config?.endpoint ?? 'https://openrouter.ai/api/v1';
  }

  async listModels(): Promise<ModelInfo[]> {
    return loadOpenRouterModels();
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.apiKey) throw new ProviderError('OPENROUTER_API_KEY is not set', this.id);

    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: this.apiKey, baseURL: this.endpoint });
    const startMs = Date.now();

    const apiMessages = request.messages.map((m) => ({ role: m.role, content: m.content }));
    if (request.systemPrompt)
      apiMessages.unshift({ role: 'system', content: request.systemPrompt });

    const response = await client.chat.completions.create({
      model: request.model,
      messages: apiMessages,
      max_tokens: request.maxTokens,
      stream: false,
      ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
      ...(request.responseFormat === 'json'
        ? { response_format: { type: 'json_object' as const } }
        : {}),
    });

    return {
      content: response.choices[0]?.message?.content ?? '',
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      model: response.model,
      provider: this.id,
      latencyMs: Date.now() - startMs,
    };
  }

  async countTokens(messages: Message[]): Promise<number> {
    return Math.ceil(messages.reduce((s, m) => s + m.content.length, 0) / 4);
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      await this.listModels();
      return true;
    } catch {
      return false;
    }
  }
}
