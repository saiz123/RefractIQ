import type { FileEntry, FileIndex, ContextPackResult, ContextEngineOptions, FileChunkResult } from './types.js';
import { DEFAULT_CONTEXT_OPTIONS } from './types.js';
import { buildFileIndex, shouldSkip } from './indexer.js';
import { scoreFile } from './scorer.js';
import { chunkFile } from './chunker.js';
import { estimateTokens } from '@agentforge/token-engine';
import type { FileSummarizerFn } from './summarizer.js';
import { stubSummarizer } from './summarizer.js';

export class ContextEngine {
  private options: ContextEngineOptions;
  private summarizer: FileSummarizerFn;

  constructor(
    options: Partial<ContextEngineOptions> = {},
    summarizer: FileSummarizerFn = stubSummarizer,
  ) {
    this.options = { ...DEFAULT_CONTEXT_OPTIONS, ...options };
    this.summarizer = summarizer;
  }

  /**
   * Build a context pack for a task description from a set of workspace files.
   *
   * Algorithm:
   * 1. Build file index (filter binary/large/ignored files)
   * 2. Score each file against the task description
   * 3. Sort by score descending, take top-K
   * 4. For each selected file:
   *    a. If file tokens > summarizationThresholdTokens → summarize (one cheap model call)
   *    b. Else → chunk at function level, include chunks until maxTotalTokens reached
   * 5. Return ContextPackResult with included chunks + excluded file list
   */
  async buildContextPack(
    files: FileEntry[],
    taskDescription: string,
  ): Promise<ContextPackResult> {
    const index = buildFileIndex(files);

    // Score and rank
    const scored = index.files
      .map((f) => scoreFile(f, taskDescription))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    const topFiles = scored.slice(0, this.options.topK);
    const excludedFiles = [
      ...scored.slice(this.options.topK).map((s) => s.file.path),
      ...index.files
        .filter((f) => shouldSkip(f))
        .map((f) => f.path),
    ];

    const chunks: FileChunkResult[] = [];
    const summarizedFiles: string[] = [];
    let totalTokens = 0;

    for (const { file } of topFiles) {
      if (totalTokens >= this.options.maxTotalTokens) {
        excludedFiles.push(file.path);
        continue;
      }

      const fileTokens = estimateTokens(file.content);

      if (fileTokens > this.options.summarizationThresholdTokens) {
        // Summarize large file
        const summary = await this.summarizer(file);
        const summaryTokens = estimateTokens(summary);

        if (totalTokens + summaryTokens <= this.options.maxTotalTokens) {
          chunks.push({
            path: file.path,
            content: summary,
            startLine: 1,
            endLine: 1,
            tokenEstimate: summaryTokens,
          });
          totalTokens += summaryTokens;
          summarizedFiles.push(file.path);
        } else {
          excludedFiles.push(file.path);
        }
      } else {
        // Chunk the file
        const fileChunks = chunkFile(file, this.options.maxFileTokens);

        for (const chunk of fileChunks) {
          if (totalTokens + chunk.tokenEstimate <= this.options.maxTotalTokens) {
            chunks.push(chunk);
            totalTokens += chunk.tokenEstimate;
          } else {
            break; // stop adding chunks from this file
          }
        }
      }
    }

    return {
      chunks,
      totalTokenEstimate: totalTokens,
      filesIncluded: [...new Set(chunks.map((c) => c.path))],
      filesExcluded: [...new Set(excludedFiles)],
      summarizedFiles,
    };
  }

  /**
   * Format a ContextPackResult into a string suitable for inserting into a prompt.
   * Each file's chunks are wrapped in <file path="...">...</file> tags.
   */
  formatForPrompt(pack: ContextPackResult): string {
    // Group chunks by file path
    const byPath = new Map<string, FileChunkResult[]>();
    for (const chunk of pack.chunks) {
      if (!byPath.has(chunk.path)) byPath.set(chunk.path, []);
      byPath.get(chunk.path)!.push(chunk);
    }

    const parts: string[] = [];
    for (const [path, fileChunks] of byPath) {
      const content = fileChunks.map((c) => c.content).join('\n// ...\n');
      parts.push(`<file path="${path}">\n${content}\n</file>`);
    }

    return parts.join('\n\n');
  }
}
