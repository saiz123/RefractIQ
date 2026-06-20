import { describe, it, expect } from 'vitest';
import { Orchestrator } from '../pipeline.js';
import type { OrchestratorConfig } from '../config.js';
import { ProviderRegistry } from '@refractiq/providers';
import { ModelRouter } from '@refractiq/model-router';
import { BudgetEnforcer, DEFAULT_BUDGET_CONFIG } from '@refractiq/token-engine';
import { RunCostTracker } from '@refractiq/cost-engine';
import type { ModelInfo, ChatRequest, ChatResponse, Message } from '@refractiq/shared';

// Minimal mock adapter for config construction
class MinimalMockAdapter {
  readonly id = 'mock';
  readonly name = 'mock';
  async chat(_req: ChatRequest): Promise<ChatResponse> {
    return {
      content: '{}',
      inputTokens: 10,
      outputTokens: 10,
      model: 'mock-model',
      provider: 'mock',
      latencyMs: 1,
    };
  }
  async countTokens(_msgs: Message[]): Promise<number> {
    return 10;
  }
  async isAvailable(): Promise<boolean> {
    return true;
  }
  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'mock-model',
        provider: 'mock',
        contextWindow: 128000,
        inputCostPer1M: 0,
        outputCostPer1M: 0,
        capabilities: ['code', 'json', 'fast', 'reasoning'],
        maxOutputTokens: 4096,
      },
    ];
  }
}

function makeConfig(): OrchestratorConfig {
  const registry = new ProviderRegistry();
  registry.register(new MinimalMockAdapter());
  return {
    registry,
    router: new ModelRouter(registry),
    budgetEnforcer: new BudgetEnforcer({ ...DEFAULT_BUDGET_CONFIG, runLimitUsd: 10 }),
    costTracker: new RunCostTracker(),
    outputDir: '/tmp/test',
    maxRepairLoops: 2,
    dryRun: false,
  };
}

describe('breakdownTasks', () => {
  it('buildOrder with 3 entries produces 3 tasks', () => {
    const orch = new Orchestrator(makeConfig());
    const tasks = orch.breakdownTasks({
      fileTree: [],
      modules: [],
      interfaces: [],
      architectureDecisions: [],
      buildOrder: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
    });
    expect(tasks).toHaveLength(3);
    expect(tasks[0].id).toBe('task-1');
    expect(tasks[1].id).toBe('task-2');
    expect(tasks[2].id).toBe('task-3');
  });

  it('second task depends on first', () => {
    const orch = new Orchestrator(makeConfig());
    const tasks = orch.breakdownTasks({
      fileTree: [],
      modules: [],
      interfaces: [],
      architectureDecisions: [],
      buildOrder: ['src/a.ts', 'src/b.ts'],
    });
    expect(tasks[0].dependsOn).toHaveLength(0);
    expect(tasks[1].dependsOn).toContain('task-1');
  });

  it('empty buildOrder falls back to fileTree entries', () => {
    const orch = new Orchestrator(makeConfig());
    const tasks = orch.breakdownTasks({
      fileTree: [
        { path: 'src/x.ts', role: 'module' },
        { path: 'src/y.ts', role: 'module' },
      ],
      modules: [],
      interfaces: [],
      architectureDecisions: [],
      buildOrder: [],
    });
    expect(tasks).toHaveLength(2);
    expect(tasks[0].id).toBe('task-1');
    expect(tasks[0].files).toContain('src/x.ts');
  });

  it('task IDs are task-1, task-2, etc.', () => {
    const orch = new Orchestrator(makeConfig());
    const tasks = orch.breakdownTasks({
      fileTree: [],
      modules: [],
      interfaces: [],
      architectureDecisions: [],
      buildOrder: ['a.ts', 'b.ts', 'c.ts', 'd.ts'],
    });
    expect(tasks.map((t) => t.id)).toEqual(['task-1', 'task-2', 'task-3', 'task-4']);
  });
});
