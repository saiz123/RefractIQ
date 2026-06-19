import type { ProviderConfig } from '@agentforge/shared';
import type { ProviderAdapter } from './types.js';
import { AnthropicAdapter } from './adapters/anthropic.js';
import { OpenAIAdapter } from './adapters/openai.js';
import { GeminiAdapter } from './adapters/gemini.js';
import { OllamaAdapter } from './adapters/ollama.js';
import { OpenRouterAdapter } from './adapters/openrouter.js';
import { MockAdapter } from './adapters/mock.js';

export function createAdapter(config: ProviderConfig): ProviderAdapter {
  switch (config.type) {
    case 'anthropic':
      return new AnthropicAdapter(config);
    case 'openai':
      return new OpenAIAdapter(config);
    case 'gemini':
      return new GeminiAdapter(config);
    case 'ollama':
      return new OllamaAdapter(config);
    case 'openrouter':
      return new OpenRouterAdapter(config);
    case 'mock':
      return new MockAdapter({
        default: {
          response: 'Mock response',
          inputTokens: 10,
          outputTokens: 20,
          latencyMs: 5,
        },
      });
    default: {
      const exhaustive: never = config.type;
      throw new Error(`Unknown provider type: ${exhaustive}`);
    }
  }
}
