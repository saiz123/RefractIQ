import type {
  ModelInfo,
  ChatRequest,
  ChatResponse,
  Message,
  ProviderConfig,
} from '@refractiq/shared';
import { ProviderError } from '@refractiq/shared';
import type { ProviderAdapter } from '../types.js';
import { loadGeminiModels } from '../modelLoader.js';

export class GeminiAdapter implements ProviderAdapter {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';

  private apiKey: string | undefined;

  constructor(_config?: ProviderConfig) {
    this.apiKey = process.env['GEMINI_API_KEY'];
  }

  async listModels(): Promise<ModelInfo[]> {
    return loadGeminiModels();
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new ProviderError('GEMINI_API_KEY is not set', this.id);
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: request.model });

    const startMs = Date.now();

    // Build the conversation history for multi-turn
    const history = request.messages
      .filter((m) => m.role !== 'system')
      .slice(0, -1)
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const lastMessage = request.messages.filter((m) => m.role !== 'system').at(-1);
    if (!lastMessage) {
      throw new ProviderError('No user message provided', this.id);
    }

    const systemPrompt =
      request.systemPrompt ?? request.messages.find((m) => m.role === 'system')?.content;

    const chatSession = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: request.maxTokens,
        temperature: request.temperature,
      },
      systemInstruction: systemPrompt,
    });

    const result = await chatSession.sendMessage(lastMessage.content);
    const latencyMs = Date.now() - startMs;

    const response = result.response;
    const content = response.text();

    const usageMetadata = response.usageMetadata;

    return {
      content,
      inputTokens: usageMetadata?.promptTokenCount ?? 0,
      outputTokens: usageMetadata?.candidatesTokenCount ?? 0,
      model: request.model,
      provider: this.id,
      latencyMs,
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
