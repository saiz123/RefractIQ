import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ProviderRegistry, createAdapter } from '@refractiq/providers';
import { ModelRouter } from '@refractiq/model-router';
import { BudgetEnforcer, DEFAULT_BUDGET_CONFIG } from '@refractiq/token-engine';
import { RunCostTracker } from '@refractiq/cost-engine';
import { Orchestrator } from '@refractiq/orchestrator';
import { WorkspaceFileWriter, SandboxRunner } from '@refractiq/workspace-engine';
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
  sandbox?: boolean;
  targetDir?: string;
  cwd?: string;
}

export async function runBuild(userPrompt: string, opts: BuildOptions): Promise<RunResult> {
  const cwd = opts.cwd ?? process.cwd();
  const refractiqDir = getRefractIQDir(cwd);
  const config = loadConfig(refractiqDir);

  // Resolve target dir and effective output dir
  const resolvedTargetDir = opts.targetDir ? resolve(cwd, opts.targetDir) : undefined;

  // Resolve output directory — use targetDir if no explicit --output given
  const effectiveOutputDir = resolvedTargetDir ?? resolve(cwd, opts.outputDir);
  mkdirSync(effectiveOutputDir, { recursive: true });

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

  const fileWriter = new WorkspaceFileWriter(effectiveOutputDir);

  const testRunner = opts.sandbox
    ? new SandboxRunner(effectiveOutputDir)
    : new WorkspaceTestRunner(effectiveOutputDir, new Set(config.security.allowedCommands));

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
    outputDir: effectiveOutputDir,
    maxRepairLoops: opts.maxRepairLoops,
    dryRun: opts.dryRun,
    fileWriter,
    testRunner,
    contextEngine,
    refractiqConfig: config,
    averageLatencyByModel,
    targetDir: resolvedTargetDir,
  });

  const runConfig = {
    userPrompt,
    budgetUsd: opts.budgetUsd,
    maxRepairLoops: opts.maxRepairLoops,
    outputDir: effectiveOutputDir,
    preferredProvider: opts.preferredProvider,
    preferredModel: opts.preferredModel,
    testCommand: opts.testCommand,
    dryRun: opts.dryRun,
    showPreview: opts.showPreview,
    sandbox: opts.sandbox,
    targetDir: resolvedTargetDir,
  };

  return orchestrator.run(userPrompt, runConfig);
}
