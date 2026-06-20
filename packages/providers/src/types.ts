import type { ModelInfo, ChatRequest, ChatResponse, Message } from '@refractiq/shared';

export interface ProviderAdapter {
  readonly id: string;
  readonly name: string;
  listModels(): Promise<ModelInfo[]>;
  chat(request: ChatRequest): Promise<ChatResponse>;
  countTokens(messages: Message[]): Promise<number>;
  isAvailable(): Promise<boolean>;
}
