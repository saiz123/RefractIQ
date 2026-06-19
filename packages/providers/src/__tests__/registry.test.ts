import { describe, it, expect } from 'vitest';
import { ProviderRegistry } from '../registry.js';
import { MockAdapter } from '../adapters/mock.js';
import type { MockFixtures } from '../adapters/mock.js';

function makeMock(id: string, response: string): MockAdapter {
  // We need a custom adapter id for each mock
  const fixtures: MockFixtures = {
    default: { response, inputTokens: 5, outputTokens: 10 },
  };
  const adapter = new MockAdapter(fixtures);
  // Override readonly id for testing distinct providers
  Object.defineProperty(adapter, 'id', { value: id, writable: false });
  return adapter;
}

describe('ProviderRegistry', () => {
  it('register() + get() round-trip works', () => {
    const registry = new ProviderRegistry();
    const adapter = makeMock('mock-a', 'response-a');
    registry.register(adapter);
    expect(registry.get('mock-a')).toBe(adapter);
  });

  it('get() throws for unregistered provider', () => {
    const registry = new ProviderRegistry();
    expect(() => registry.get('nonexistent')).toThrow();
  });

  it('has() returns correct values', () => {
    const registry = new ProviderRegistry();
    const adapter = makeMock('mock-b', 'response-b');
    expect(registry.has('mock-b')).toBe(false);
    registry.register(adapter);
    expect(registry.has('mock-b')).toBe(true);
  });

  it('listAll() returns all registered adapters', () => {
    const registry = new ProviderRegistry();
    const a = makeMock('mock-c', 'c');
    const b = makeMock('mock-d', 'd');
    registry.register(a);
    registry.register(b);
    const all = registry.listAll();
    expect(all).toHaveLength(2);
    expect(all).toContain(a);
    expect(all).toContain(b);
  });

  it('getAllModels() aggregates models from multiple mock adapters', async () => {
    const registry = new ProviderRegistry();
    const a = makeMock('mock-e', 'e');
    const b = makeMock('mock-f', 'f');
    registry.register(a);
    registry.register(b);
    const models = await registry.getAllModels();
    // Each mock adapter returns 1 model, so we expect 2 total
    expect(models.length).toBeGreaterThanOrEqual(2);
  });

  it('listAvailable() returns only available adapters', async () => {
    const registry = new ProviderRegistry();
    const available = makeMock('mock-g', 'g');
    registry.register(available);
    const result = await registry.listAvailable();
    expect(result).toContain(available);
  });
});
