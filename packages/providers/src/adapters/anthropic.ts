import type {
  ModelInfo,
  ChatRequest,
  ChatResponse,
  Message,
  ProviderConfig,
} from '@agentforge/shared';
import { ProviderError } from '@agentforge/shared';
import type { ProviderAdapter } from '../types.js';
import { loadAnthropicModels } from '../modelLoader.js';

export class AnthropicAdapter implements ProviderAdapter {
  readonly id = 'anthropic';
  readonly name = 'Anthropic';

  private apiKey: string | undefined;

  constructor(_config?: ProviderConfig) {
    this.apiKey = process.env['ANTHROPIC_API_KEY'];
  }

  async listModels(): Promise<ModelInfo[]> {
    return loadAnthropicModels();
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new ProviderError('ANTHROPIC_API_KEY is not set', this.id);
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: this.apiKey });

    const startMs = Date.now();

    // Build messages array for the API
    const apiMessages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Extract system prompt from messages or use provided one
    const systemMsg =
      request.systemPrompt ?? request.messages.find((m) => m.role === 'system')?.content;

    const response = await client.messages.create({
      model: request.model,
      max_tokens: request.maxTokens,
      messages: apiMessages,
      stream: false,
      ...(systemMsg ? { system: systemMsg } : {}),
      ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
    });
    const latencyMs = Date.now() - startMs;

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';

    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
      provider: this.id,
      latencyMs,
      // cache fields wired in Phase 4 when token-engine is implemented
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
