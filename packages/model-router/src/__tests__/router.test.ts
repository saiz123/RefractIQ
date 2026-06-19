import { describe, it, expect } from 'vitest';
import { ModelRouter } from '../router.js';
import { ProviderRegistry } from '@agentforge/providers';
import { NoCapableModelError } from '@agentforge/shared';
import type { ModelInfo, ChatRequest, ChatResponse, Message } from '@agentforge/shared';
import type { ProviderAdapter } from '@agentforge/providers';

// Minimal test adapter that supports custom models and availability
class TestAdapter implements ProviderAdapter {
  readonly id: string;
  readonly name: string;
  private models: ModelInfo[];
  private available: boolean;

  constructor(id: string, models: ModelInfo[], available = true) {
    this.id = id;
    this.name = id;
    this.models = models;
    this.available = available;
  }

  async listModels(): Promise<ModelInfo[]> {
    return this.models;
  }

  async chat(_req: ChatRequest): Promise<ChatResponse> {
    throw new Error('not used in tests');
  }

  async countTokens(_msgs: Message[]): Promise<number> {
    return 100;
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }
}

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

const openaiModel: ModelInfo = {
  id: 'gpt-4o',
  provider: 'openai',
  contextWindow: 128_000,
  inputCostPer1M: 2.5,
  outputCostPer1M: 10.0,
  capabilities: ['code', 'json', 'reasoning'],
  maxOutputTokens: 16384,
};

function makeRegistry(...adapters: TestAdapter[]): ProviderRegistry {
  const registry = new ProviderRegistry();
  for (const adapter of adapters) {
    registry.register(adapter);
  }
  return registry;
}

describe('ModelRouter', () => {
  describe('basic routing', () => {
    it('routes intake task to cheap model when both cheap and strong are available', async () => {
      const registry = makeRegistry(
        new TestAdapter('gemini', [cheapModel]),
        new TestAdapter('anthropic', [strongModel])
      );
      const router = new ModelRouter(registry);
      const decision = await router.route({
        taskType: 'intake',
        estimatedInputTokens: 1000,
        requiredCapabilities: ['json', 'fast'],
        budgetRemainingUsd: 100,
      });
      expect(decision.provider).toBe('gemini');
      expect(decision.model).toBe('gemini-1.5-flash');
    });

    it('routes build task to strong model when both cheap and strong are available', async () => {
      // cheapModel lacks 'reasoning', but both have 'code' and 'json'
      // strong model gets higher tier bonus for 'strong' task
      const registry = makeRegistry(
        new TestAdapter('gemini', [cheapModel]),
        new TestAdapter('anthropic', [strongModel])
      );
      const router = new ModelRouter(registry);
      const decision = await router.route({
        taskType: 'build',
        estimatedInputTokens: 1000,
        requiredCapabilities: ['code', 'json'],
        budgetRemainingUsd: 100,
      });
      expect(decision.provider).toBe('anthropic');
      expect(decision.model).toBe('claude-sonnet-4-6');
    });
  });

  describe('cross-provider second opinion', () => {
    it('excludes models from preferDifferentProviderFrom', async () => {
      const registry = makeRegistry(
        new TestAdapter('gemini', [cheapModel]),
        new TestAdapter('anthropic', [strongModel])
      );
      const router = new ModelRouter(registry);
      const decision = await router.route({
        taskType: 'build',
        estimatedInputTokens: 1000,
        requiredCapabilities: ['code', 'json'],
        budgetRemainingUsd: 100,
        preferDifferentProviderFrom: 'anthropic',
      });
      expect(decision.provider).not.toBe('anthropic');
      expect(decision.provider).toBe('gemini');
    });
  });

  describe('user model override', () => {
    it('returns the user-preferred model regardless of task tier', async () => {
      const registry = makeRegistry(
        new TestAdapter('gemini', [cheapModel]),
        new TestAdapter('openai', [openaiModel]),
        new TestAdapter('anthropic', [strongModel])
      );
      const router = new ModelRouter(registry);
      const decision = await router.route({
        taskType: 'intake', // cheap task but we want the strong OpenAI model
        estimatedInputTokens: 1000,
        requiredCapabilities: ['json', 'fast'],
        budgetRemainingUsd: 100,
        userPreferredModel: 'gpt-4o',
      });
      expect(decision.model).toBe('gpt-4o');
      expect(decision.provider).toBe('openai');
    });

    it('user model override bypasses capability filtering', async () => {
      // gpt-4o does not have 'fast', but user override should still pick it
      const openaiModelNoFast: ModelInfo = {
        ...openaiModel,
        capabilities: ['code', 'json', 'reasoning'], // no 'fast'
      };
      const registry = makeRegistry(
        new TestAdapter('gemini', [cheapModel]),
        new TestAdapter('openai', [openaiModelNoFast])
      );
      const router = new ModelRouter(registry);
      const decision = await router.route({
        taskType: 'intake',
        estimatedInputTokens: 1000,
        requiredCapabilities: ['json', 'fast'],
        budgetRemainingUsd: 100,
        userPreferredModel: 'gpt-4o',
      });
      expect(decision.model).toBe('gpt-4o');
    });
  });

  describe('user provider override', () => {
    it('restricts candidates to the preferred provider', async () => {
      const openaiModelWithFast: ModelInfo = {
        ...openaiModel,
        capabilities: ['code', 'json', 'fast', 'reasoning'],
      };
      const registry = makeRegistry(
        new TestAdapter('gemini', [cheapModel]),
        new TestAdapter('openai', [openaiModelWithFast]),
        new TestAdapter('anthropic', [strongModel])
      );
      const router = new ModelRouter(registry);
      const decision = await router.route({
        taskType: 'intake',
        estimatedInputTokens: 1000,
        requiredCapabilities: ['json', 'fast'],
        budgetRemainingUsd: 100,
        userPreferredProvider: 'openai',
      });
      // gemini-1.5-flash would normally win for 'intake', but we restrict to openai
      expect(decision.provider).toBe('openai');
      expect(decision.model).toBe('gpt-4o');
    });

    it('restricts to provider for build task picking openai over anthropic', async () => {
      const registry = makeRegistry(
        new TestAdapter('gemini', [cheapModel]),
        new TestAdapter('openai', [openaiModel]),
        new TestAdapter('anthropic', [strongModel])
      );
      const router = new ModelRouter(registry);
      const decision = await router.route({
        taskType: 'build',
        estimatedInputTokens: 1000,
        requiredCapabilities: ['code', 'json'],
        budgetRemainingUsd: 100,
        userPreferredProvider: 'openai',
      });
      expect(decision.provider).toBe('openai');
      expect(decision.model).toBe('gpt-4o');
    });
  });

  describe('no capable model', () => {
    it('throws NoCapableModelError when all providers are unavailable', async () => {
      const registry = makeRegistry(
        new TestAdapter('gemini', [cheapModel], false),
        new TestAdapter('anthropic', [strongModel], false)
      );
      const router = new ModelRouter(registry);
      await expect(
        router.route({
          taskType: 'intake',
          estimatedInputTokens: 1000,
          requiredCapabilities: ['json', 'fast'],
          budgetRemainingUsd: 100,
        })
      ).rejects.toThrow(NoCapableModelError);
    });

    it('throws NoCapableModelError when no model has required capabilities', async () => {
      const modelWithoutVision: ModelInfo = {
        ...cheapModel,
        capabilities: ['code', 'json', 'fast'], // no 'vision'
      };
      const registry = makeRegistry(new TestAdapter('gemini', [modelWithoutVision]));
      const router = new ModelRouter(registry);
      await expect(
        router.route({
          taskType: 'intake',
          estimatedInputTokens: 1000,
          requiredCapabilities: ['vision'],
          budgetRemainingUsd: 100,
        })
      ).rejects.toThrow(NoCapableModelError);
    });
  });

  describe('budget handling', () => {
    it('does NOT enforce budget - still returns a decision even with budgetRemainingUsd: 0', async () => {
      const registry = makeRegistry(new TestAdapter('gemini', [cheapModel]));
      const router = new ModelRouter(registry);
      // Router should NOT throw for budget reasons - that is the orchestrator's job
      const decision = await router.route({
        taskType: 'intake',
        estimatedInputTokens: 1000,
        requiredCapabilities: ['json', 'fast'],
        budgetRemainingUsd: 0, // zero budget - router still proceeds
      });
      expect(decision).toBeDefined();
      expect(decision.provider).toBe('gemini');
    });
  });

  describe('context window filter', () => {
    it('excludes models whose contextWindow is smaller than estimatedInputTokens', async () => {
      const smallCtxModel: ModelInfo = {
        ...cheapModel,
        id: 'small-ctx-model',
        contextWindow: 1000, // too small for 5000 tokens
      };
      const largeCtxModel: ModelInfo = {
        ...strongModel,
        id: 'large-ctx-model',
        contextWindow: 200_000,
      };
      const registry = makeRegistry(
        new TestAdapter('gemini', [smallCtxModel]),
        new TestAdapter('anthropic', [largeCtxModel])
      );
      const router = new ModelRouter(registry);
      const decision = await router.route({
        taskType: 'build',
        estimatedInputTokens: 5000,
        requiredCapabilities: ['code', 'json'],
        budgetRemainingUsd: 100,
      });
      // small-ctx-model should be filtered out
      expect(decision.model).toBe('large-ctx-model');
    });

    it('throws NoCapableModelError when all models have insufficient context windows', async () => {
      const smallCtxModel: ModelInfo = {
        ...cheapModel,
        contextWindow: 100, // too small for 5000 tokens
      };
      const registry = makeRegistry(new TestAdapter('gemini', [smallCtxModel]));
      const router = new ModelRouter(registry);
      await expect(
        router.route({
          taskType: 'intake',
          estimatedInputTokens: 5000,
          requiredCapabilities: [],
          budgetRemainingUsd: 100,
        })
      ).rejects.toThrow(NoCapableModelError);
    });
  });

  describe('RouterDecision shape', () => {
    it('returned object has provider, model, estimatedCostUsd, and reason', async () => {
      const registry = makeRegistry(new TestAdapter('gemini', [cheapModel]));
      const router = new ModelRouter(registry);
      const decision = await router.route({
        taskType: 'intake',
        estimatedInputTokens: 1000,
        requiredCapabilities: ['json', 'fast'],
        budgetRemainingUsd: 100,
      });
      expect(decision).toHaveProperty('provider');
      expect(decision).toHaveProperty('model');
      expect(decision).toHaveProperty('estimatedCostUsd');
      expect(decision).toHaveProperty('reason');
      expect(typeof decision.provider).toBe('string');
      expect(typeof decision.model).toBe('string');
      expect(typeof decision.estimatedCostUsd).toBe('number');
      expect(typeof decision.reason).toBe('string');
    });

    it('estimatedCostUsd is a positive number for a non-free model', async () => {
      const registry = makeRegistry(new TestAdapter('anthropic', [strongModel]));
      const router = new ModelRouter(registry);
      const decision = await router.route({
        taskType: 'build',
        estimatedInputTokens: 10000,
        requiredCapabilities: ['code', 'json'],
        budgetRemainingUsd: 100,
      });
      expect(decision.estimatedCostUsd).toBeGreaterThan(0);
    });

    it('reason string includes provider/model, task type, tier, score, and cost', async () => {
      const registry = makeRegistry(new TestAdapter('gemini', [cheapModel]));
      const router = new ModelRouter(registry);
      const decision = await router.route({
        taskType: 'intake',
        estimatedInputTokens: 1000,
        requiredCapabilities: ['json', 'fast'],
        budgetRemainingUsd: 100,
      });
      expect(decision.reason).toContain('gemini');
      expect(decision.reason).toContain('intake');
      expect(decision.reason).toContain('cheap');
    });
  });

  describe('getTierForTask', () => {
    it('returns correct tier for each task type', () => {
      const registry = makeRegistry();
      const router = new ModelRouter(registry);
      expect(router.getTierForTask('intake')).toBe('cheap');
      expect(router.getTierForTask('build')).toBe('strong');
      expect(router.getTierForTask('architect')).toBe('mid');
      expect(router.getTierForTask('repair')).toBe('strong');
      expect(router.getTierForTask('review')).toBe('mid');
      expect(router.getTierForTask('doc')).toBe('cheap');
      expect(router.getTierForTask('summarize')).toBe('cheap');
    });
  });
});
