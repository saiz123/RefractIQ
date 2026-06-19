import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ProviderRegistry, createAdapter } from '@agentforge/providers';
import { ModelRouter } from '@agentforge/model-router';
import { BudgetEnforcer, DEFAULT_BUDGET_CONFIG } from '@agentforge/token-engine';
import { RunCostTracker } from '@agentforge/cost-engine';
import { Orchestrator } from '@agentforge/orchestrator';
import { WorkspaceFileWriter } from '@agentforge/workspace-engine';
import { WorkspaceTestRunner } from '@agentforge/evaluator';
import { ContextEngine } from '@agentforge/context-engine';
import { loadConfig, getAgentForgeDir, type RunResult } from '@agentforge/shared';

export interface BuildOptions {
  budgetUsd: number;
  maxRepairLoops: number;
  outputDir: string;
  preferredProvider?: string;
  preferredModel?: string;
  testCommand?: string;
  dryRun: boolean;
  cwd?: string;
}

export async function runBuild(userPrompt: string, opts: BuildOptions): Promise<RunResult> {
  const cwd = opts.cwd ?? process.cwd();
  const agentForgeDir = getAgentForgeDir(cwd);
  const config = loadConfig(agentForgeDir);

  // Resolve output directory
  const outputDir = resolve(cwd, opts.outputDir);
  mkdirSync(outputDir, { recursive: true });

  // Build provider registry from config
  const registry = new ProviderRegistry();
  for (const providerConfig of config.providers) {
    registry.register(createAdapter(providerConfig));
  }

  if (registry.listAll().length === 0) {
    throw new Error('No providers configured. Run "agentforge providers add" first.');
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
  };

  return orchestrator.run(userPrompt, runConfig);
}
