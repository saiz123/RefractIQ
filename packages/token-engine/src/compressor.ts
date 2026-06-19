/**
 * Compress test output / error logs before sending to the repair-loop Builder agent.
 *
 * Rules applied in order:
 * 1. Truncate stack traces to MAX_STACK_FRAMES frames
 * 2. Deduplicate identical consecutive error lines
 * 3. Hard-cap total output at MAX_OUTPUT_TOKENS tokens (≈ MAX_OUTPUT_TOKENS * 4 chars)
 */

const MAX_STACK_FRAMES = 5;
const MAX_OUTPUT_TOKENS = 2_000;
const MAX_OUTPUT_CHARS = MAX_OUTPUT_TOKENS * 4;

export function compressLog(rawLog: string): string {
  let log = truncateStackTraces(rawLog);
  log = deduplicateLines(log);
  log = capLength(log);
  return log;
}

function truncateStackTraces(log: string): string {
  const lines = log.split('\n');
  const result: string[] = [];
  let stackFrameCount = 0;
  let inStack = false;

  for (const line of lines) {
    const isStackFrame = /^\s+at\s/.test(line);

    if (isStackFrame) {
      if (!inStack) {
        inStack = true;
        stackFrameCount = 0;
      }
      stackFrameCount++;
      if (stackFrameCount <= MAX_STACK_FRAMES) {
        result.push(line);
      } else if (stackFrameCount === MAX_STACK_FRAMES + 1) {
        result.push('    ... (stack truncated)');
      }
    } else {
      inStack = false;
      stackFrameCount = 0;
      result.push(line);
    }
  }

  return result.join('\n');
}

function deduplicateLines(log: string): string {
  const lines = log.split('\n');
  const result: string[] = [];
  let prev = '';
  let dupCount = 0;

  for (const line of lines) {
    if (line === prev && line.trim() !== '') {
      dupCount++;
    } else {
      if (dupCount > 0) {
        result.push(`  (repeated ${dupCount} more times)`);
        dupCount = 0;
      }
      result.push(line);
      prev = line;
    }
  }
  if (dupCount > 0) result.push(`  (repeated ${dupCount} more times)`);

  return result.join('\n');
}

function capLength(log: string): string {
  if (log.length <= MAX_OUTPUT_CHARS) return log;
  return log.slice(0, MAX_OUTPUT_CHARS) + '\n... (log truncated to 2000 tokens)';
}
