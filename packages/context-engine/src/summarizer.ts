import type { FileEntry } from './types.js';
import { estimateTokens } from '@refractiq/token-engine';

/** Contract for a function that summarizes a file using a cheap model call */
export type FileSummarizerFn = (file: FileEntry) => Promise<string>;

/**
 * Stub summarizer — used in Phase 6 tests and when no real summarizer is injected.
 * Returns a placeholder summary without making any model call.
 */
export const stubSummarizer: FileSummarizerFn = async (file: FileEntry): Promise<string> => {
  const lineCount = file.content.split('\n').length;
  const tokenCount = estimateTokens(file.content);
  return `[Summary of ${file.path}: ${lineCount} lines, ~${tokenCount} tokens. Full content not included — file exceeded context budget.]`;
};
