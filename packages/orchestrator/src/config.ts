import type { ProviderRegistry } from '@agentforge/providers';
import type { ModelRouter } from '@agentforge/model-router';
import type { BudgetEnforcer } from '@agentforge/token-engine';
import type { RunCostTracker } from '@agentforge/cost-engine';
import type { ContextEngine } from '@agentforge/context-engine';
import type { AgentForgeConfig } from '@agentforge/shared';
import type { FileWriter, TestRunner } from './interfaces.js';

export interface OrchestratorConfig {
  registry: ProviderRegistry;
  router: ModelRouter;
  budgetEnforcer: BudgetEnforcer;
  costTracker: RunCostTracker;
  outputDir: string;
  maxRepairLoops: number;
  dryRun: boolean;
  // Optional — injected in Phase 7
  fileWriter?: FileWriter;
  testRunner?: TestRunner;
  contextEngine?: ContextEngine;
  agentForgeConfig?: AgentForgeConfig; // for task overrides
  averageLatencyByModel?: Record<string, number>; // for latency-aware routing
}
