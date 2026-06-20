import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ProviderRegistry, createAdapter } from '@refractiq/providers';
import { ModelRouter } from '@refractiq/model-router';
import { BudgetEnforcer, DEFAULT_BUDGET_CONFIG } from '@refractiq/token-engine';
import { RunCostTracker } from '@refractiq/cost-engine';
import { Orchestrator } from '@refractiq/orchestrator';
import { WorkspaceFileWriter } from '@refractiq/workspace-engine';
import { WorkspaceTestRunner } from '@refractiq/evaluator';
import { ContextEngine } from '@refractiq/context-engine';
import { loadConfig, getRefractIQDir, type RunResult } from '@refractiq/shared';
import { openDbAsync } from './db/client.js';
import { getAverageLatencyByModel } from './db/runs.js';

export interface BuildOptions {
  budgetUsd: number;
  maxRepairLoops: number;
  outputDir: string;
  preferredProvider?: string;
  preferredModel?: string;
  testCommand?: string;
  dryRun: boolean;
  showPreview?: boolean;
  cwd?: string;
}

export async function runBuild(userPrompt: string, opts: BuildOptions): Promise<RunResult> {
  const cwd = opts.cwd ?? process.cwd();
  const refractiqDir = getRefractIQDir(cwd);
  const config = loadConfig(refractiqDir);

  // Resolve output directory
  const outputDir = resolve(cwd, opts.outputDir);
  mkdirSync(outputDir, { recursive: true });

  // Build provider registry from config
  const registry = new ProviderRegistry();
  for (const providerConfig of config.providers) {
    registry.register(createAdapter(providerConfig));
  }

  if (registry.listAll().length === 0) {
    throw new Error('No providers configured. Run "refractiq providers add" first.');
  }

  // Assemble pipeline components
  const router = new ModelRouter(registry);

  const budgetConfig = {
    ...DEFAULT_BUDGET_CONFIG,
    runLimitUsd: opts.budgetUsd,
  };
  const budgetEnforcer = new BudgetEnforcer(budgetConfig);
  const costTracker = new RunCostTracker();

  const fileWriter = new WorkspaceFileWriter(outputDir);
  const testRunner = new WorkspaceTestRunner(outputDir, new Set(config.security.allowedCommands));
  const contextEngine = new ContextEngine();

  // Get historical latency data for latency-aware routing
  let averageLatencyByModel: Record<string, number> = {};
  try {
    const db = await openDbAsync(cwd);
    averageLatencyByModel = await getAverageLatencyByModel(db);
  } catch {
    // Non-fatal: latency routing falls back to cost-only
  }

  const orchestrator = new Orchestrator({
    registry,
    router,
    budgetEnforcer,
    costTracker,
    outputDir,
    maxRepairLoops: opts.maxRepairLoops,
    dryRun: opts.dryRun,
    fileWriter,
    testRunner,
    contextEngine,
    refractiqConfig: config,
    averageLatencyByModel,
  });

  const runConfig = {
    userPrompt,
    budgetUsd: opts.budgetUsd,
    maxRepairLoops: opts.maxRepairLoops,
    outputDir,
    preferredProvider: opts.preferredProvider,
    preferredModel: opts.preferredModel,
    testCommand: opts.testCommand,
    dryRun: opts.dryRun,
    showPreview: opts.showPreview,
  };

  return orchestrator.run(userPrompt, runConfig);
}
