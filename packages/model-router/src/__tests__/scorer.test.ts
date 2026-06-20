import { describe, it, expect } from 'vitest';
import { scoreModel } from '../scorer.js';
import type { ModelInfo, RouterRequest } from '@refractiq/shared';

const cheapModel: ModelInfo = {
  id: 'gemini-1.5-flash',
  provider: 'gemini',
  contextWindow: 1_000_000,
  inputCostPer1M: 0.075,
  outputCostPer1M: 0.3,
  capabilities: ['code', 'json', 'fast'],
  maxOutputTokens: 8192,
};

const strongModel: ModelInfo = {
  id: 'claude-sonnet-4-6',
  provider: 'anthropic',
  contextWindow: 200_000,
  inputCostPer1M: 3.0,
  outputCostPer1M: 15.0,
  capabilities: ['code', 'json', 'reasoning'],
  maxOutputTokens: 64000,
};

const midModel: ModelInfo = {
  id: 'gpt-4o-mini',
  provider: 'openai',
  contextWindow: 128_000,
  inputCostPer1M: 0.15,
  outputCostPer1M: 0.6,
  capabilities: ['code', 'json', 'fast'],
  maxOutputTokens: 16384,
};

const baseRequest: RouterRequest = {
  taskType: 'intake',
  estimatedInputTokens: 1000,
  requiredCapabilities: ['json', 'fast'],
  budgetRemainingUsd: 10,
};

describe('scoreModel', () => {
  it('returns -1 if a required capability is missing', () => {
    const request: RouterRequest = {
      ...baseRequest,
      requiredCapabilities: ['reasoning'],
    };
    // cheapModel does not have 'reasoning'
    expect(scoreModel(cheapModel, request)).toBe(-1);
  });

  it('returns -1 if any required capability is missing (multiple requirements)', () => {
    const modelWithoutFast: ModelInfo = {
      ...cheapModel,
      capabilities: ['code', 'json'], // missing 'fast'
    };
    const request: RouterRequest = {
      ...baseRequest,
      requiredCapabilities: ['json', 'fast'],
    };
    expect(scoreModel(modelWithoutFast, request)).toBe(-1);
  });

  it('a cheap model scores higher than an expensive model for a cheap-tier task', () => {
    const cheapRequest: RouterRequest = {
      taskType: 'intake',
      estimatedInputTokens: 1000,
      requiredCapabilities: ['json', 'fast'],
      budgetRemainingUsd: 10,
    };
    // Both models need 'fast' — modify strongModel for this test
    const strongWithFast: ModelInfo = {
      ...strongModel,
      capabilities: ['code', 'json', 'fast', 'reasoning'],
    };
    const cheapScore = scoreModel(cheapModel, cheapRequest);
    const strongScore = scoreModel(strongWithFast, cheapRequest);
    expect(cheapScore).toBeGreaterThan(strongScore);
  });

  it('a strong model (with reasoning) scores higher than a cheap model for a strong-tier task', () => {
    const strongRequest: RouterRequest = {
      taskType: 'build',
      estimatedInputTokens: 5000,
      requiredCapabilities: ['code', 'json'],
      budgetRemainingUsd: 100,
    };
    const cheapScore = scoreModel(cheapModel, strongRequest);
    const strongScore = scoreModel(strongModel, strongRequest);
    expect(strongScore).toBeGreaterThan(cheapScore);
  });

  it('returns a positive score when all required capabilities are present', () => {
    const score = scoreModel(cheapModel, baseRequest);
    expect(score).toBeGreaterThan(0);
  });

  it('mid model gets +100 for mid-tier task', () => {
    const midRequest: RouterRequest = {
      taskType: 'architect',
      estimatedInputTokens: 1000,
      requiredCapabilities: [],
      budgetRemainingUsd: 10,
    };
    const midModelWithReasoning: ModelInfo = {
      ...midModel,
      inputCostPer1M: 1.0, // mid tier (0.20–2.00)
      capabilities: ['code', 'json', 'reasoning'],
    };
    const score = scoreModel(midModelWithReasoning, midRequest);
    // Base 100 (mid tier for mid task) - 1.0 * 10 (cost) + context bonus
    expect(score).toBeGreaterThan(80);
  });

  it('context window size contributes a modest bonus (tiebreaker)', () => {
    const modelSmallCtx: ModelInfo = {
      ...cheapModel,
      id: 'small-ctx',
      contextWindow: 4_000,
    };
    const modelLargeCtx: ModelInfo = {
      ...cheapModel,
      id: 'large-ctx',
      contextWindow: 1_000_000,
    };
    const request: RouterRequest = {
      ...baseRequest,
      requiredCapabilities: ['json', 'fast'],
    };
    const smallScore = scoreModel(modelSmallCtx, request);
    const largeScore = scoreModel(modelLargeCtx, request);
    expect(largeScore).toBeGreaterThan(smallScore);
  });

  it('context window bonus is capped at 5 points', () => {
    const hugeCtxModel: ModelInfo = {
      ...cheapModel,
      contextWindow: 10_000_000, // 10M context
    };
    const regularCtxModel: ModelInfo = {
      ...cheapModel,
      contextWindow: 500_000, // 500K context (5 bonus)
    };
    const request: RouterRequest = {
      ...baseRequest,
      requiredCapabilities: [],
    };
    const hugeScore = scoreModel(hugeCtxModel, request);
    const regularScore = scoreModel(regularCtxModel, request);
    // Both should get the max 5 point context bonus since both exceed 500K
    expect(hugeScore).toBe(regularScore);
  });
});
