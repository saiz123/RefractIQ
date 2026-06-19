export interface FileEntry {
  path: string;
  content: string;
  sizeBytes: number;
  lastModifiedMs?: number;
}

export interface FileIndex {
  files: FileEntry[];
  totalSizeBytes: number;
  indexedAt: number;
}

export interface ScoredFile {
  file: FileEntry;
  score: number;
  reasons: string[]; // human-readable reasons e.g. ['keyword match: "TodoStore"', 'import match']
}

export interface FileChunkResult {
  path: string;
  content: string;
  startLine: number;
  endLine: number;
  tokenEstimate: number;
}

export interface ContextPackResult {
  chunks: FileChunkResult[];
  totalTokenEstimate: number;
  filesIncluded: string[];
  filesExcluded: string[];
  summarizedFiles: string[]; // files that were too large and got summarized
}

export interface ContextEngineOptions {
  /** Max tokens to include in total context pack */
  maxTotalTokens: number;
  /** Max tokens per individual file chunk */
  maxFileTokens: number;
  /** If a file exceeds this, trigger summarization instead of chunking */
  summarizationThresholdTokens: number;
  /** Number of top-scoring files to include */
  topK: number;
}

export const DEFAULT_CONTEXT_OPTIONS: ContextEngineOptions = {
  maxTotalTokens: 8_000,
  maxFileTokens: 2_000,
  summarizationThresholdTokens: 3_000,
  topK: 10,
};
