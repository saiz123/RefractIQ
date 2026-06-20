import type { ProviderRegistry } from '@refractiq/providers';
import type { ModelRouter } from '@refractiq/model-router';
import type { BudgetEnforcer } from '@refractiq/token-engine';
import type { RunCostTracker } from '@refractiq/cost-engine';
import type { ContextEngine } from '@refractiq/context-engine';
import type { RefractIQConfig } from '@refractiq/shared';
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
  refractiqConfig?: RefractIQConfig; // for task overrides
  averageLatencyByModel?: Record<string, number>; // for latency-aware routing
}
