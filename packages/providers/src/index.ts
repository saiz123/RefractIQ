// @refractiq/providers
// ProviderAdapter interface, registry, adapters, and factory

export type { ProviderAdapter } from './types.js';
export { ProviderRegistry } from './registry.js';
export { MockAdapter } from './adapters/mock.js';
export type { MockFixture, MockFixtures } from './adapters/mock.js';
export { AnthropicAdapter } from './adapters/anthropic.js';
export { OpenAIAdapter } from './adapters/openai.js';
export { GeminiAdapter } from './adapters/gemini.js';
export { OllamaAdapter } from './adapters/ollama.js';
export { OpenRouterAdapter } from './adapters/openrouter.js';
export { createAdapter } from './factory.js';

// Re-export shared types needed by consumers of this package
export type {
  ModelInfo,
  ChatRequest,
  ChatResponse,
  Message,
  MessageRole,
  ProviderConfig,
  Capability,
} from '@refractiq/shared';
