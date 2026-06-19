import type { TaskType } from './run.js';
import type { Capability } from './provider.js';

export type TaskTier = 'cheap' | 'mid' | 'strong';

export interface RouterRequest {
  taskType: TaskType;
  estimatedInputTokens: number;
  requiredCapabilities: Capability[];
  budgetRemainingUsd: number;
  preferDifferentProviderFrom?: string; // for Reviewer: exclude this provider
  userPreferredProvider?: string; // hard override
  userPreferredModel?: string; // hard override (takes precedence over provider)
}

export interface RouterDecision {
  provider: string;
  model: string;
  estimatedCostUsd: number;
  reason: string; // human-readable explanation logged to run record
}
