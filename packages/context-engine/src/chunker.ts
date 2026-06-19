import type { FileEntry, FileChunkResult } from './types.js';
import { estimateTokens } from '@agentforge/token-engine';

/**
 * Split a file into chunks at logical boundaries.
 *
 * Strategy (language-agnostic heuristic):
 * - Split at blank lines that precede a function/class/export declaration
 * - Each chunk is at most maxTokens tokens
 * - If a single logical block exceeds maxTokens, truncate with a note
 *
 * For files that are small enough to fit in maxTokens, returns a single chunk (the whole file).
 */
export function chunkFile(file: FileEntry, maxTokens: number): FileChunkResult[] {
  const totalTokens = estimateTokens(file.content);

  if (totalTokens <= maxTokens) {
    return [
      {
        path: file.path,
        content: file.content,
        startLine: 1,
        endLine: file.content.split('\n').length,
        tokenEstimate: totalTokens,
      },
    ];
  }

  const lines = file.content.split('\n');
  const chunks: FileChunkResult[] = [];

  // Find logical split points: lines that look like function/class declarations
  // preceded by an empty line
  const splitPoints = findSplitPoints(lines);

  let currentStart = 0;

  for (const splitPoint of [...splitPoints, lines.length]) {
    const chunkLines = lines.slice(currentStart, splitPoint);
    const chunkContent = chunkLines.join('\n');
    const chunkTokens = estimateTokens(chunkContent);

    if (chunkTokens === 0) {
      currentStart = splitPoint;
      continue;
    }

    if (chunkTokens <= maxTokens) {
      chunks.push({
        path: file.path,
        content: chunkContent,
        startLine: currentStart + 1,
        endLine: splitPoint,
        tokenEstimate: chunkTokens,
      });
    } else {
      // Chunk is too large — truncate it
      const maxChars = maxTokens * 4;
      const truncated = chunkContent.slice(0, maxChars) + '\n// ... (truncated)';
      chunks.push({
        path: file.path,
        content: truncated,
        startLine: currentStart + 1,
        endLine: splitPoint,
        tokenEstimate: maxTokens,
      });
    }

    currentStart = splitPoint;
  }

  return chunks.length > 0
    ? chunks
    : [
        {
          path: file.path,
          content: file.content.slice(0, maxTokens * 4) + '\n// ... (truncated)',
          startLine: 1,
          endLine: lines.length,
          tokenEstimate: maxTokens,
        },
      ];
}

/**
 * Find line indices that are good split points.
 * A split point is a line that starts a new top-level declaration
 * (function, class, export, const at top level, etc.)
 * preceded by at least one blank line.
 */
function findSplitPoints(lines: string[]): number[] {
  const points: number[] = [];
  const DECLARATION_PATTERN =
    /^(export\s+)?(async\s+)?(function|class|const|let|var|interface|type|enum|def |func |pub fn )/;

  for (let i = 1; i < lines.length; i++) {
    const prevLine = lines[i - 1]?.trim();
    const currLine = lines[i] ?? '';

    if (prevLine === '' && DECLARATION_PATTERN.test(currLine)) {
      points.push(i);
    }
  }

  return points;
}
