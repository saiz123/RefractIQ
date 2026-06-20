import { describe, it, expect } from 'vitest';
import { Orchestrator } from '../pipeline.js';
import type { OrchestratorConfig } from '../config.js';
import { ProviderRegistry } from '@refractiq/providers';
import type { ProviderAdapter } from '@refractiq/providers';
import { ModelRouter } from '@refractiq/model-router';
import { BudgetEnforcer, DEFAULT_BUDGET_CONFIG } from '@refractiq/token-engine';
import { RunCostTracker } from '@refractiq/cost-engine';
import type { ModelInfo, ChatRequest, ChatResponse, Message, RunConfig } from '@refractiq/shared';

// ────────────────────────────────────────────────────────────
// Mock Responses
// ────────────────────────────────────────────────────────────

const MOCK_REQUIREMENTS = JSON.stringify({
  clarifiedGoal: 'A CLI that reverses a string',
  targetLanguage: 'TypeScript',
  techStack: ['Node.js'],
  constraints: [],
  outOfScope: [],
  suggestedTestCommand: 'npx vitest run',
});

const MOCK_ARCHITECTURE = JSON.stringify({
  fileTree: [{ path: 'src/index.ts', role: 'entry point' }],
  modules: [{ name: 'CLI', responsibility: 'reverse string and print' }],
  interfaces: [],
  architectureDecisions: ['keep it simple'],
  buildOrder: ['src/index.ts'],
});

const MOCK_BUILD = JSON.stringify({
  files: [{ path: 'src/index.ts', content: 'console.log("hello")', action: 'create' }],
  explanation: 'Created entry point',
  assumptions: [],
});

const MOCK_REVIEW = JSON.stringify({
  issues: [],
  verdict: 'pass',
  suggestions: ['add tests'],
});

const MOCK_DOC = JSON.stringify({
  readme: '# Reverse CLI\nReverses a string.',
  changelog: '## v0.1.0\n- Initial release',
  inlineDocs: [],
});

// ────────────────────────────────────────────────────────────
// Sequential Mock Adapter
// ────────────────────────────────────────────────────────────

class SequentialMockAdapter implements ProviderAdapter {
  readonly id: string;
  readonly name: string;
  private responses: string[];
  private index = 0;
  private models: ModelInfo[];

  constructor(id: string, models: ModelInfo[], responses: string[]) {
    this.id = id;
    this.name = id;
    this.responses = responses;
    this.models = models;
  }

  async chat(_req: ChatRequest): Promise<ChatResponse> {
    const content = this.responses[this.index % this.responses.length] ?? '{}';
    this.index++;
    return {
      content,
      inputTokens: 50,
      outputTokens: 30,
      model: this.models[0]?.id ?? 'mock',
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
    return this.models;
  }
}

// ────────────────────────────────────────────────────────────
// Helper: build a standard ModelInfo for mock
// ────────────────────────────────────────────────────────────

function makeMockModel(id = 'mock-model', providerId = 'mock'): ModelInfo {
  return {
    id,
    provider: providerId,
    contextWindow: 128000,
    inputCostPer1M: 1.0,
    outputCostPer1M: 3.0,
    capabilities: ['code', 'json', 'fast', 'reasoning'],
    maxOutputTokens: 4096,
  };
}

// ────────────────────────────────────────────────────────────
// Helper: build standard RunConfig
// ────────────────────────────────────────────────────────────

function makeRunConfig(overrides: Partial<RunConfig> = {}): RunConfig {
  return {
    userPrompt: 'reverse a string',
    budgetUsd: 10.0,
    maxRepairLoops: 2,
    outputDir: '/tmp/refractiq-test',
    dryRun: false,
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────
// Helper: build config
// ────────────────────────────────────────────────────────────

function makeConfig(
  responses: string[],
  budgetOverride?: Partial<typeof DEFAULT_BUDGET_CONFIG>,
  maxRepairLoops = 2
): OrchestratorConfig {
  const model = makeMockModel();
  const adapter = new SequentialMockAdapter('mock', [model], responses);
  const registry = new ProviderRegistry();
  registry.register(adapter);

  const budgetConfig = { ...DEFAULT_BUDGET_CONFIG, runLimitUsd: 10.0, ...budgetOverride };

  return {
    registry,
    router: new ModelRouter(registry),
    budgetEnforcer: new BudgetEnforcer(budgetConfig),
    costTracker: new RunCostTracker(),
    outputDir: '/tmp/refractiq-test',
    maxRepairLoops,
    dryRun: false,
  };
}

// ────────────────────────────────────────────────────────────
// Constants for dry-run test
// ────────────────────────────────────────────────────────────

const REQUIREMENTS_JSON = MOCK_REQUIREMENTS;
const ARCHITECTURE_JSON = MOCK_ARCHITECTURE;
const TEST_MODEL: ModelInfo = makeMockModel('counting-model', 'counting');
const tmpDir = '/tmp/refractiq-test';

// ────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────

describe('Orchestrator pipeline', () => {
  it('Test 1: full pipeline runs to completion', async () => {
    const responses = [
      MOCK_REQUIREMENTS, // intake
      MOCK_ARCHITECTURE, // architect
      MOCK_BUILD, // build (task-1)
      MOCK_REVIEW, // review
      MOCK_DOC, // doc
    ];

    const config = makeConfig(responses);
    const orchestrator = new Orchestrator(config);
    const result = await orchestrator.run('reverse a string', makeRunConfig());

    expect(result.status).toBe('complete');
    expect(result.id).toBeTruthy();
    expect(result.id.length).toBeGreaterThan(0);
    // intake, architect, build, test(stub), review, doc = at least 4 real LLM stages + test stub
    expect(result.stages.length).toBeGreaterThanOrEqual(4);
    expect(result.totalCostUsd).toBeGreaterThanOrEqual(0);
    expect(result.totalInputTokens).toBeGreaterThan(0);
    expect(result.totalOutputTokens).toBeGreaterThan(0);
  });

  it('Test 2: budget abort returns aborted status without throwing', async () => {
    const responses = [MOCK_REQUIREMENTS, MOCK_ARCHITECTURE, MOCK_BUILD, MOCK_REVIEW, MOCK_DOC];
    const config = makeConfig(responses, { runLimitUsd: 0.000001 });
    const orchestrator = new Orchestrator(config);

    const result = await orchestrator.run(
      'reverse a string',
      makeRunConfig({ budgetUsd: 0.000001 })
    );

    expect(result.status).toBe('aborted');
  });

  it('Test 3: stage result tracking — intake stage has correct fields', async () => {
    const responses = [MOCK_REQUIREMENTS, MOCK_ARCHITECTURE, MOCK_BUILD, MOCK_REVIEW, MOCK_DOC];
    const config = makeConfig(responses);
    const orchestrator = new Orchestrator(config);
    const result = await orchestrator.run('reverse a string', makeRunConfig());

    const intakeStage = result.stages.find((s) => s.stage === 'intake');
    expect(intakeStage).toBeDefined();
    expect(intakeStage!.provider).toBeTruthy();
    expect(intakeStage!.model).toBeTruthy();
    expect(intakeStage!.inputTokens).toBeGreaterThan(0);
    expect(intakeStage!.costUsd).toBeGreaterThanOrEqual(0);
    expect(intakeStage!.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('Test 4: repair loop respects maxRepairLoops=0', async () => {
    const responses = [MOCK_REQUIREMENTS, MOCK_ARCHITECTURE, MOCK_BUILD, MOCK_REVIEW, MOCK_DOC];
    const config = makeConfig(responses, undefined, 0);
    const orchestrator = new Orchestrator(config);
    const result = await orchestrator.run('reverse a string', makeRunConfig({ maxRepairLoops: 0 }));

    expect(result.status).toBe('complete');
    const repairStages = result.stages.filter((s) => s.stage === 'repair');
    expect(repairStages).toHaveLength(0);
  });

  it('Test 5: no repair loop when review passes (verdict=pass, failed=0)', async () => {
    // MOCK_REVIEW has verdict: 'pass' so no repair should run
    const responses = [MOCK_REQUIREMENTS, MOCK_ARCHITECTURE, MOCK_BUILD, MOCK_REVIEW, MOCK_DOC];
    const config = makeConfig(responses);
    const orchestrator = new Orchestrator(config);
    const result = await orchestrator.run('reverse a string', makeRunConfig());

    const repairStages = result.stages.filter((s) => s.stage === 'repair');
    expect(repairStages).toHaveLength(0);
  });

  it('dry-run does not invoke provider beyond intake + architect', async () => {
    let callCount = 0;

    class CountingAdapter implements ProviderAdapter {
      readonly id = 'counting';
      readonly name = 'counting';
      private models: ModelInfo[] = [TEST_MODEL];

      async chat(_req: ChatRequest): Promise<ChatResponse> {
        callCount++;
        // Return appropriate response based on call order
        const responses = [REQUIREMENTS_JSON, ARCHITECTURE_JSON];
        const content = responses[(callCount - 1) % responses.length] ?? '{}';
        return {
          content,
          inputTokens: 50,
          outputTokens: 30,
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
        return this.models;
      }
    }

    const registry = new ProviderRegistry();
    registry.register(new CountingAdapter());
    const router = new ModelRouter(registry);
    const budgetEnforcer = new BudgetEnforcer({ ...DEFAULT_BUDGET_CONFIG, runLimitUsd: 10.0 });
    const costTracker = new RunCostTracker();

    const orchestrator = new Orchestrator({
      registry,
      router,
      budgetEnforcer,
      costTracker,
      outputDir: tmpDir,
      maxRepairLoops: 3,
      dryRun: false, // dryRun is in runConfig, not OrchestratorConfig
    });

    const result = await orchestrator.run('reverse a string', {
      userPrompt: 'reverse a string',
      budgetUsd: 10.0,
      maxRepairLoops: 3,
      outputDir: tmpDir,
      dryRun: true, // dry-run via RunConfig
    });

    expect(result.status).toBe('complete');
    // Dry-run should only call intake + architect = max 2 provider calls
    expect(callCount).toBeLessThanOrEqual(2);
    // No build/review/repair/doc stages should appear
    const stageNames = result.stages.filter((s) => s.provider).map((s) => s.stage);
    expect(stageNames).not.toContain('build');
    expect(stageNames).not.toContain('review');
    expect(stageNames).not.toContain('doc');
    expect(stageNames).not.toContain('repair');
  });
});
