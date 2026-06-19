import type { ModelInfo, ChatRequest, ChatResponse, Message, ProviderConfig } from '@agentforge/shared';
import type { ProviderAdapter } from '../types.js';

export interface MockFixture {
  response: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
}

export interface MockFixtures {
  default: MockFixture;
  [key: string]: MockFixture;
}

export class MockAdapter implements ProviderAdapter {
  readonly id = 'mock';
  readonly name = 'Mock Provider';

  constructor(private fixtures: MockFixtures, _config?: ProviderConfig) {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const fixture = this.fixtures[request.model] ?? this.fixtures['default'];
    const startMs = Date.now();
    const latency = fixture.latencyMs ?? 10;
    // Simulate minimal latency without actual sleep in tests
    const elapsed = Date.now() - startMs;
    return {
      content: fixture.response,
      inputTokens: fixture.inputTokens ?? 10,
      outputTokens: fixture.outputTokens ?? 20,
      model: request.model,
      provider: 'mock',
      latencyMs: Math.max(latency, elapsed),
    };
  }

  async countTokens(messages: Message[]): Promise<number> {
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'mock-model',
        provider: 'mock',
        contextWindow: 4096,
        inputCostPer1M: 0,
        outputCostPer1M: 0,
        capabilities: ['code', 'json'],
        maxOutputTokens: 1024,
      },
    ];
  }
}
