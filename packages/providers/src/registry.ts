import type { ModelInfo } from '@refractiq/shared';
import type { ProviderAdapter } from './types.js';

export class ProviderRegistry {
  private adapters = new Map<string, ProviderAdapter>();

  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): ProviderAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new Error(`Provider "${id}" is not registered`);
    }
    return adapter;
  }

  has(id: string): boolean {
    return this.adapters.has(id);
  }

  listAll(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  async listAvailable(): Promise<ProviderAdapter[]> {
    const results = await Promise.all(
      this.listAll().map(async (adapter) => {
        const available = await adapter.isAvailable();
        return available ? adapter : null;
      })
    );
    return results.filter((a): a is ProviderAdapter => a !== null);
  }

  /**
   * Aggregates ModelInfo from all registered adapters.
   * Since listModels() is async, this returns a Promise.
   * The name getAllModels is kept per spec; the async variant is canonical.
   */
  async getAllModels(): Promise<ModelInfo[]> {
    const allNested = await Promise.all(this.listAll().map((adapter) => adapter.listModels()));
    return allNested.flat();
  }
}
