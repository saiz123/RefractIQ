import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ProviderRegistry } from '@agentforge/providers';
import { ModelRouter } from '@agentforge/model-router';
import { BudgetEnforcer, DEFAULT_BUDGET_CONFIG } from '@agentforge/token-engine';
import { RunCostTracker } from '@agentforge/cost-engine';
import { Orchestrator } from '@agentforge/orchestrator';
import type { ModelInfo, ChatRequest, ChatResponse, Message } from '@agentforge/shared';
import type { ProviderAdapter } from '@agentforge/providers';

// --- Fixtures ---

const REQUIREMENTS_JSON = JSON.stringify({
  clarifiedGoal: 'A CLI that reverses a string',
  targetLanguage: 'TypeScript',
  techStack: ['Node.js', 'Commander.js'],
  constraints: ['must work on Node 20+'],
  outOfScope: ['web UI'],
  suggestedTestCommand: 'echo "no tests"',
});

const ARCHITECTURE_JSON = JSON.stringify({
  fileTree: [{ path: 'src/index.ts', role: 'entry point' }],
  modules: [{ name: 'CLI', responsibility: 'parse args and reverse string' }],
  interfaces: [],
  architectureDecisions: ['keep it simple'],
  buildOrder: ['src/index.ts'],
});

const BUILD_JSON = JSON.stringify({
  files: [
    {
      path: 'src/index.ts',
      content: '#!/usr/bin/env node\nconsole.log("hello")',
      action: 'create',
    },
  ],
  explanation: 'Created entry point',
  assumptions: [],
});

const REVIEW_JSON = JSON.stringify({
  issues: [],
  verdict: 'pass',
  suggestions: ['add tests'],
});

const DOC_JSON = JSON.stringify({
  readme: '# Reverse CLI\n\nReverses a string.',
  changelog: '## v0.1.0\n- Initial release',
  inlineDocs: [],
});

// Sequential mock adapter
const TEST_MODEL: ModelInfo = {
  id: 'mock-model',
  provider: 'mock',
  contextWindow: 200_000,
  inputCostPer1M: 0.1,
  outputCostPer1M: 0.3,
  capabilities: ['code', 'json', 'fast', 'reasoning'],
  maxOutputTokens: 8192,
};

class SequentialMockAdapter implements ProviderAdapter {
  readonly id: string;
  readonly name: string;
  private responses: string[];
  private index = 0;

  constructor(id: string, responses: string[]) {
    this.id = id;
    this.name = id;
    this.responses = responses;
  }

  async chat(_req: ChatRequest): Promise<ChatResponse> {
    const content = this.responses[this.index % this.responses.length] ?? '{}';
    this.index++;
    return {
      content,
      inputTokens: 100,
      outputTokens: 50,
      model: TEST_MODEL.id,
      provider: this.id,
      latencyMs: 5,
    };
  }

  async countTokens(_msgs: Message[]): Promise<number> {
    return 100;
  }
  async isAvailable(): Promise<boolean> {
    return true;
  }
  async listModels(): Promise<ModelInfo[]> {
    return [TEST_MODEL];
  }
}

// --- Tests ---

describe('E2E: hello-world pipeline', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'agentforge-e2e-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function buildOrchestrator(responses: string[]) {
    const registry = new ProviderRegistry();
    registry.register(new SequentialMockAdapter('mock', responses));

    const router = new ModelRouter(registry);
    const budgetEnforcer = new BudgetEnforcer({ ...DEFAULT_BUDGET_CONFIG, runLimitUsd: 10.0 });
    const costTracker = new RunCostTracker();

    return new Orchestrator({
      registry,
      router,
      budgetEnforcer,
      costTracker,
      outputDir: tmpDir,
      maxRepairLoops: 3,
      dryRun: false,
      // No fileWriter or testRunner — Phase 7 injection tested separately
    });
  }

  it('completes a full pipeline run with mock provider', async () => {
    const orchestrator = buildOrchestrator([
      REQUIREMENTS_JSON, // intake
      ARCHITECTURE_JSON, // architect
      BUILD_JSON, // build task-1
      REVIEW_JSON, // review
      DOC_JSON, // doc
    ]);

    const result = await orchestrator.run('reverse a string CLI', {
      userPrompt: 'reverse a string CLI',
      budgetUsd: 10.0,
      maxRepairLoops: 3,
      outputDir: tmpDir,
      dryRun: false,
    });

    expect(result.status).toBe('complete');
    expect(result.id).toBeTruthy();
    expect(result.stages.length).toBeGreaterThanOrEqual(4);
  });

  it('tracks token usage across stages', async () => {
    const orchestrator = buildOrchestrator([
      REQUIREMENTS_JSON,
      ARCHITECTURE_JSON,
      BUILD_JSON,
      REVIEW_JSON,
      DOC_JSON,
    ]);

    const result = await orchestrator.run('reverse a string CLI', {
      userPrompt: 'reverse a string CLI',
      budgetUsd: 10.0,
      maxRepairLoops: 3,
      outputDir: tmpDir,
      dryRun: false,
    });

    expect(result.totalInputTokens).toBeGreaterThan(0);
    expect(result.totalOutputTokens).toBeGreaterThan(0);
    expect(result.totalCostUsd).toBeGreaterThan(0);
  });

  it('returns aborted status when budget is exceeded', async () => {
    // Create orchestrator with an impossibly small budget to trigger abort
    const registry = new ProviderRegistry();
    registry.register(
      new SequentialMockAdapter('mock', [
        REQUIREMENTS_JSON,
        ARCHITECTURE_JSON,
        BUILD_JSON,
        REVIEW_JSON,
        DOC_JSON,
      ])
    );
    const router = new ModelRouter(registry);
    const budgetEnforcer = new BudgetEnforcer({ ...DEFAULT_BUDGET_CONFIG, runLimitUsd: 0.000001 });
    const costTracker = new RunCostTracker();
    const orchestrator = new Orchestrator({
      registry,
      router,
      budgetEnforcer,
      costTracker,
      outputDir: tmpDir,
      maxRepairLoops: 0,
      dryRun: false,
    });

    const result = await orchestrator.run('reverse a string', {
      userPrompt: 'reverse a string',
      budgetUsd: 0.000001,
      maxRepairLoops: 0,
      outputDir: tmpDir,
      dryRun: false,
    });

    expect(result.status).toBe('aborted');
  });

  it('does not trigger repair loop when review passes', async () => {
    const orchestrator = buildOrchestrator([
      REQUIREMENTS_JSON,
      ARCHITECTURE_JSON,
      BUILD_JSON,
      REVIEW_JSON,
      DOC_JSON,
    ]);

    const result = await orchestrator.run('reverse a string', {
      userPrompt: 'reverse a string',
      budgetUsd: 10.0,
      maxRepairLoops: 3,
      outputDir: tmpDir,
      dryRun: false,
    });

    const repairStages = result.stages.filter((s) => s.stage === 'repair');
    expect(repairStages).toHaveLength(0);
  });

  it('all stage results have required fields', async () => {
    const orchestrator = buildOrchestrator([
      REQUIREMENTS_JSON,
      ARCHITECTURE_JSON,
      BUILD_JSON,
      REVIEW_JSON,
      DOC_JSON,
    ]);

    const result = await orchestrator.run('reverse a string', {
      userPrompt: 'reverse a string',
      budgetUsd: 10.0,
      maxRepairLoops: 3,
      outputDir: tmpDir,
      dryRun: false,
    });

    for (const stage of result.stages.filter((s) => s.provider)) {
      expect(stage.stage).toBeTruthy();
      expect(stage.provider).toBeTruthy();
      expect(stage.model).toBeTruthy();
      expect(stage.inputTokens).toBeGreaterThanOrEqual(0);
      expect(stage.outputTokens).toBeGreaterThanOrEqual(0);
      expect(stage.costUsd).toBeGreaterThanOrEqual(0);
      expect(stage.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('no API keys appear in result', async () => {
    const orchestrator = buildOrchestrator([
      REQUIREMENTS_JSON,
      ARCHITECTURE_JSON,
      BUILD_JSON,
      REVIEW_JSON,
      DOC_JSON,
    ]);

    const result = await orchestrator.run('reverse a string', {
      userPrompt: 'reverse a string',
      budgetUsd: 10.0,
      maxRepairLoops: 3,
      outputDir: tmpDir,
      dryRun: false,
    });

    const resultStr = JSON.stringify(result);
    // No OpenAI-style keys
    expect(resultStr).not.toMatch(/sk-[A-Za-z0-9-]{20,}/);
    // No Anthropic-style keys
    expect(resultStr).not.toMatch(/sk-ant-[A-Za-z0-9-]{20,}/);
  });
});
