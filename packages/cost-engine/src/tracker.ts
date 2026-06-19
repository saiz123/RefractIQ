import type { StageType } from '@agentforge/shared';

export interface StageSpend {
  stage: StageType;
  iteration: number;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  durationMs: number;
}

/**
 * Accumulates spend across all stages in a single run.
 * The orchestrator calls record() after each stage completes.
 */
export class RunCostTracker {
  private entries: StageSpend[] = [];

  record(entry: StageSpend): void {
    this.entries.push(entry);
  }

  totalCostUsd(): number {
    return this.entries.reduce((sum, e) => sum + e.costUsd, 0);
  }

  totalInputTokens(): number {
    return this.entries.reduce((sum, e) => sum + e.inputTokens, 0);
  }

  totalOutputTokens(): number {
    return this.entries.reduce((sum, e) => sum + e.outputTokens, 0);
  }

  getEntries(): readonly StageSpend[] {
    return this.entries;
  }

  /** Summary table rows for agentforge report */
  toReportRows(): Array<{
    stage: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: string; // formatted "$0.0042"
    durationMs: number;
  }> {
    return this.entries.map((e) => ({
      stage: e.iteration > 0 ? `${e.stage}[${e.iteration}]` : e.stage,
      provider: e.provider,
      model: e.model,
      inputTokens: e.inputTokens,
      outputTokens: e.outputTokens,
      costUsd: `$${e.costUsd.toFixed(4)}`,
      durationMs: e.durationMs,
    }));
  }
}
