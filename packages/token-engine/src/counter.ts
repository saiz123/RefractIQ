import type { Message } from '@agentforge/shared';

/**
 * Estimate token count for a string.
 * Approximation: 1 token ≈ 4 characters (standard industry estimate).
 * Accurate enough for budget enforcement; exact counting happens at the provider level.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate total token count for a messages array.
 * Adds 4 tokens per message for role overhead.
 */
export function estimateMessagesTokens(messages: Message[]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content) + 4, 0);
}

/**
 * Estimate token count for a JSON-serializable object.
 */
export function estimateJsonTokens(obj: unknown): number {
  return estimateTokens(JSON.stringify(obj));
}
