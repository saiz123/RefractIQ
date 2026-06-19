/**
 * Truncate a git diff to fit within a token budget.
 * Keeps the diff header and as many hunks as fit.
 * Appends a truncation notice if hunks were dropped.
 */
export function truncateDiff(diff: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (diff.length <= maxChars) return diff;

  const truncated = diff.slice(0, maxChars);
  // Try to cut at a clean hunk boundary
  const lastHunkBoundary = truncated.lastIndexOf('\n@@');
  const cutPoint = lastHunkBoundary > 0 ? lastHunkBoundary : maxChars;

  return diff.slice(0, cutPoint) + '\n\n... (diff truncated to fit token budget)';
}

/**
 * Extract only the failing test names and their error lines from a test output string.
 * Used to build repair context without sending full verbose test logs.
 */
export function extractFailingSummary(testOutput: string): string {
  const lines = testOutput.split('\n');
  const relevant: string[] = [];

  for (const line of lines) {
    // Keep lines that indicate failures or errors
    if (/FAIL|FAILED|Error:|error:|✗|×|AssertionError|Expected|Received|at\s+\w/.test(line)) {
      relevant.push(line);
    }
  }

  return relevant.slice(0, 50).join('\n'); // max 50 relevant lines
}
