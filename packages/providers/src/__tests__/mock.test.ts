import { describe, it, expect } from 'vitest';
import { MockAdapter } from '../adapters/mock.js';
import type { MockFixtures } from '../adapters/mock.js';

const fixtures: MockFixtures = {
  default: {
    response: 'Hello from mock!',
    inputTokens: 15,
    outputTokens: 25,
    latencyMs: 5,
  },
};

describe('MockAdapter', () => {
  it('isAvailable() returns true', async () => {
    const adapter = new MockAdapter(fixtures);
    expect(await adapter.isAvailable()).toBe(true);
  });

  it('chat() returns the default fixture response', async () => {
    const adapter = new MockAdapter(fixtures);
    const result = await adapter.chat({
      model: 'mock-model',
      messages: [{ role: 'user', content: 'Hello' }],
      maxTokens: 100,
    });
    expect(result.content).toBe('Hello from mock!');
    expect(result.provider).toBe('mock');
    expect(result.model).toBe('mock-model');
  });

  it('chat() response has correct token counts', async () => {
    const adapter = new MockAdapter(fixtures);
    const result = await adapter.chat({
      model: 'mock-model',
      messages: [{ role: 'user', content: 'Hello' }],
      maxTokens: 100,
    });
    expect(result.inputTokens).toBe(15);
    expect(result.outputTokens).toBe(25);
  });

  it('listModels() returns at least one model', async () => {
    const adapter = new MockAdapter(fixtures);
    const models = await adapter.listModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toHaveProperty('id');
    expect(models[0]).toHaveProperty('provider');
  });

  it('countTokens() estimates based on character count', async () => {
    const adapter = new MockAdapter(fixtures);
    // 8 chars / 4 = 2 tokens
    const count = await adapter.countTokens([{ role: 'user', content: '12345678' }]);
    expect(count).toBe(2);
  });
});
