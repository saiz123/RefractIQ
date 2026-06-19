import type { ModelInfo } from '@agentforge/shared';

export interface CallCost {
  inputCostUsd: number;
  outputCostUsd: number;
  cacheReadCostUsd: number;
  cacheWriteCostUsd: number;
  totalCostUsd: number;
}

/**
 * Calculate the USD cost of a single model call.
 * Cache read costs 10% of input price. Cache write costs 125% of input price.
 * These ratios match Anthropic's prompt caching pricing (used as a conservative default).
 */
export function calculateCallCost(
  model: ModelInfo,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens = 0,
  cacheWriteTokens = 0,
): CallCost {
  const inputCostUsd = (inputTokens / 1_000_000) * model.inputCostPer1M;
  const outputCostUsd = (outputTokens / 1_000_000) * model.outputCostPer1M;
  const cacheReadCostUsd = (cacheReadTokens / 1_000_000) * model.inputCostPer1M * 0.1;
  const cacheWriteCostUsd = (cacheWriteTokens / 1_000_000) * model.inputCostPer1M * 1.25;
  const totalCostUsd = inputCostUsd + outputCostUsd + cacheReadCostUsd + cacheWriteCostUsd;
  return { inputCostUsd, outputCostUsd, cacheReadCostUsd, cacheWriteCostUsd, totalCostUsd };
}

/**
 * Estimate the cost of a call before it is made, using only input token count.
 * Assumes output ≈ 30% of input tokens (conservative planning estimate).
 */
export function estimateCallCost(
  model: ModelInfo,
  estimatedInputTokens: number,
): number {
  const estimatedOutputTokens = Math.ceil(estimatedInputTokens * 0.3);
  return calculateCallCost(model, estimatedInputTokens, estimatedOutputTokens).totalCostUsd;
}
