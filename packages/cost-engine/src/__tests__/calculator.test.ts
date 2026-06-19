import { describe, it, expect } from 'vitest';
import { calculateCallCost, estimateCallCost } from '../calculator.js';
import type { ModelInfo } from '@agentforge/shared';

const mockModel: ModelInfo = {
  id: 'test-model',
  provider: 'test-provider',
  contextWindow: 200_000,
  inputCostPer1M: 3.0,
  outputCostPer1M: 15.0,
  capabilities: ['code', 'json'],
  maxOutputTokens: 4096,
};

describe('calculateCallCost', () => {
  it('returns zero cost for zero tokens', () => {
    const cost = calculateCallCost(mockModel, 0, 0);
    expect(cost.inputCostUsd).toBe(0);
    expect(cost.outputCostUsd).toBe(0);
    expect(cost.cacheReadCostUsd).toBe(0);
    expect(cost.cacheWriteCostUsd).toBe(0);
    expect(cost.totalCostUsd).toBe(0);
  });

  it('calculates input cost correctly for 1M tokens at $3.00/1M', () => {
    const cost = calculateCallCost(mockModel, 1_000_000, 0);
    expect(cost.inputCostUsd).toBe(3.0);
  });

  it('calculates output cost correctly for 1M tokens at $15.00/1M', () => {
    const cost = calculateCallCost(mockModel, 0, 1_000_000);
    expect(cost.outputCostUsd).toBe(15.0);
  });

  it('cache read tokens cost 10% of input price', () => {
    const cost = calculateCallCost(mockModel, 0, 0, 1_000_000, 0);
    // 1M cache read tokens * $3.00/1M * 0.1 = $0.30
    expect(cost.cacheReadCostUsd).toBeCloseTo(0.3, 10);
  });

  it('cache write tokens cost 125% of input price', () => {
    const cost = calculateCallCost(mockModel, 0, 0, 0, 1_000_000);
    // 1M cache write tokens * $3.00/1M * 1.25 = $3.75
    expect(cost.cacheWriteCostUsd).toBeCloseTo(3.75, 10);
  });

  it('totalCostUsd equals sum of all four components', () => {
    const cost = calculateCallCost(mockModel, 500_000, 200_000, 100_000, 50_000);
    const expected =
      cost.inputCostUsd + cost.outputCostUsd + cost.cacheReadCostUsd + cost.cacheWriteCostUsd;
    expect(cost.totalCostUsd).toBeCloseTo(expected, 10);
  });
});

describe('estimateCallCost', () => {
  it('returns a number > 0 for non-zero input tokens', () => {
    const cost = estimateCallCost(mockModel, 10_000);
    expect(cost).toBeGreaterThan(0);
  });

  it('assumes output ≈ 30% of input tokens', () => {
    const inputTokens = 1_000_000;
    const estimatedOutputTokens = Math.ceil(inputTokens * 0.3);
    const expectedCost =
      (inputTokens / 1_000_000) * mockModel.inputCostPer1M +
      (estimatedOutputTokens / 1_000_000) * mockModel.outputCostPer1M;
    const cost = estimateCallCost(mockModel, inputTokens);
    expect(cost).toBeCloseTo(expectedCost, 10);
  });

  it('returns 0 for zero input tokens', () => {
    const cost = estimateCallCost(mockModel, 0);
    expect(cost).toBe(0);
  });
});
