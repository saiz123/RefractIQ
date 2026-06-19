import { BudgetExceededError } from '@agentforge/shared';
import type { TaskType } from '@agentforge/shared';

export interface BudgetConfig {
  /** Hard limit on tokens sent in a single model call */
  maxCallInputTokens: number;
  /** Per-stage USD budget — stages exceeding this are skipped */
  perStageUsd: Partial<Record<TaskType, number>>;
  /** Per-run total USD limit — run is aborted if exceeded */
  runLimitUsd: number;
}

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  maxCallInputTokens: 32_000,
  perStageUsd: {
    intake: 0.05,
    architect: 0.1,
    build: 0.2,
    review: 0.1,
    repair: 0.2,
    doc: 0.05,
    summarize: 0.02,
  },
  runLimitUsd: 0.5,
};

export class BudgetEnforcer {
  constructor(private config: BudgetConfig) {}

  /**
   * Enforce per-call token limit.
   * Call this before every model call. Returns the safe maxTokens to pass to the provider.
   * Never throws — just clamps the value.
   */
  clampCallTokens(requestedTokens: number): number {
    return Math.min(requestedTokens, this.config.maxCallInputTokens);
  }

  /**
   * Check per-stage budget.
   * Returns true if the stage is within budget, false if it should be skipped.
   * Does NOT throw — the orchestrator decides what to do when this returns false.
   */
  isStageWithinBudget(taskType: TaskType, estimatedCostUsd: number): boolean {
    const limit = this.config.perStageUsd[taskType];
    if (limit === undefined) return true; // no limit configured for this stage
    return estimatedCostUsd <= limit;
  }

  /**
   * Check per-run budget.
   * Throws BudgetExceededError if adding estimatedCostUsd would exceed runLimitUsd.
   * Call this before every stage with the accumulated spend so far.
   */
  assertRunBudget(spentSoFarUsd: number, estimatedNextCostUsd: number): void {
    const projected = spentSoFarUsd + estimatedNextCostUsd;
    if (projected > this.config.runLimitUsd) {
      throw new BudgetExceededError(this.config.runLimitUsd, projected);
    }
  }

  get runLimitUsd(): number {
    return this.config.runLimitUsd;
  }

  get maxCallInputTokens(): number {
    return this.config.maxCallInputTokens;
  }
}
