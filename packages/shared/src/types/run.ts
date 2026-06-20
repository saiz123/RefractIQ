export type RunStatus = 'running' | 'complete' | 'failed' | 'aborted';
export type StageType =
  | 'intake'
  | 'architect'
  | 'task-breakdown'
  | 'build'
  | 'test'
  | 'review'
  | 'repair'
  | 'doc'
  | 'report';
export type TaskType = 'intake' | 'architect' | 'build' | 'review' | 'doc' | 'summarize' | 'repair';

export interface RunConfig {
  userPrompt: string;
  budgetUsd: number;
  maxRepairLoops: number;
  outputDir: string;
  preferredProvider?: string;
  preferredModel?: string;
  testCommand?: string;
  dryRun: boolean;
}

export interface StageResult {
  stage: StageType;
  iteration: number;
  status: 'complete' | 'failed' | 'skipped';
  provider?: string;
  model?: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
}

export interface ContextStats {
  totalFilesScored: number;
  filesIncluded: number;
  filesExcluded: number;
  summarizedFiles: number;
  estimatedTokensSaved: number;
}

export interface RunResult {
  id: string;
  status: RunStatus;
  userPrompt: string;
  stages: StageResult[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  durationMs: number;
  outputPath: string;
  contextStats?: ContextStats; // populated when context engine was active
}
