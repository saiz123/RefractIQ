export type Capability = 'code' | 'json' | 'reasoning' | 'fast' | 'vision' | 'long-context';

export interface ModelInfo {
  id: string;
  provider: string;
  contextWindow: number;
  inputCostPer1M: number;
  outputCostPer1M: number;
  capabilities: Capability[];
  maxOutputTokens: number;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  role: MessageRole;
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  maxTokens: number;
  temperature?: number;
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
}

export interface ChatResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: string;
  latencyMs: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface ProviderConfig {
  id: string;
  type: 'anthropic' | 'openai' | 'gemini' | 'ollama' | 'openrouter' | 'mock';
  name: string;
  endpoint?: string;
  modelOverrides?: Partial<ModelInfo>[];
}
