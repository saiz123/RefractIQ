import type {
  ModelInfo,
  ChatRequest,
  ChatResponse,
  Message,
  ProviderConfig,
} from '@refractiq/shared';
import { ProviderError } from '@refractiq/shared';
import type { ProviderAdapter } from '../types.js';
import { loadOpenAIModels } from '../modelLoader.js';

export class OpenAIAdapter implements ProviderAdapter {
  readonly id = 'openai';
  readonly name = 'OpenAI';

  private apiKey: string | undefined;
  private endpoint: string | undefined;

  constructor(private config?: ProviderConfig) {
    this.apiKey = process.env['OPENAI_API_KEY'];
    this.endpoint = config?.endpoint ?? process.env['OPENAI_COMPATIBLE_ENDPOINT'];
  }

  async listModels(): Promise<ModelInfo[]> {
    return loadOpenAIModels();
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new ProviderError('OPENAI_API_KEY is not set', this.id);
    }

    const OpenAI = (await import('openai')).default;
    const clientOptions: ConstructorParameters<typeof OpenAI>[0] = {
      apiKey: this.apiKey,
    };
    if (this.endpoint) {
      clientOptions.baseURL = this.endpoint;
    }
    const client = new OpenAI(clientOptions);

    const startMs = Date.now();

    const apiMessages = request.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (request.systemPrompt) {
      apiMessages.unshift({ role: 'system', content: request.systemPrompt });
    }

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
    const latencyMs = Date.now() - startMs;

    const content = response.choices[0]?.message?.content ?? '';

    return {
      content,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      model: response.model,
      provider: this.id,
      latencyMs,
      // OpenAI Predicted Outputs cache hit tokens
      cacheReadTokens: (response.usage as unknown as Record<string, unknown>)?.[
        'prompt_tokens_details'
      ]
        ? ((response.usage as unknown as Record<string, Record<string, number>>)[
            'prompt_tokens_details'
          ]?.['cached_tokens'] ?? 0)
        : 0,
    };
  }

  async countTokens(messages: Message[]): Promise<number> {
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalChars / 4);
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
