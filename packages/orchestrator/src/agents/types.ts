import type { TaskType } from '@agentforge/shared';

export interface AgentCall<TInput, TOutput> {
  taskType: TaskType;
  systemPrompt: string;
  buildUserMessage(input: TInput): string;
  parseResponse(raw: string): TOutput;
}
