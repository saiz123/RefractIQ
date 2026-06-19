/**
 * Parse test runner output into pass/fail/error counts.
 * Supports vitest, jest, pytest, and go test output patterns.
 */
export interface ParsedTestOutput {
  passed: number;
  failed: number;
  errors: number;
}

export function parseTestOutput(
  stdout: string,
  stderr: string,
  exitCode: number
): ParsedTestOutput {
  const combined = stdout + '\n' + stderr;

  // Try Go test pattern first (most distinctive — uses "ok  \t" tab notation)
  if (combined.includes('ok  \t') || combined.includes('--- PASS')) {
    const goFailed = (combined.match(/--- FAIL/g) ?? []).length;
    const goPassed = (combined.match(/--- PASS/g) ?? []).length;
    return { passed: goPassed, failed: goFailed, errors: 0 };
  }

  // Try vitest / jest pattern: "X passed", "Y failed"
  const vitestPassed = combined.match(/(\d+)\s+passed/i);
  const vitestFailed = combined.match(/(\d+)\s+failed/i);

  if (vitestPassed || vitestFailed) {
    // Also try to extract an error count (e.g., pytest-style "1 error" in combined output)
    const errMatch = combined.match(/(\d+)\s+errors?/i);
    return {
      passed: vitestPassed ? parseInt(vitestPassed[1]!, 10) : 0,
      failed: vitestFailed ? parseInt(vitestFailed[1]!, 10) : 0,
      errors: errMatch ? parseInt(errMatch[1]!, 10) : 0,
    };
  }

  // Try pytest pattern: "X passed, Y failed, Z error"
  const pytestMatch = combined.match(/(\d+) passed(?:,\s*(\d+) failed)?(?:,\s*(\d+) errors?)?/i);
  if (pytestMatch) {
    return {
      passed: parseInt(pytestMatch[1] ?? '0', 10),
      failed: parseInt(pytestMatch[2] ?? '0', 10),
      errors: parseInt(pytestMatch[3] ?? '0', 10),
    };
  }

  // Fallback: use exit code
  if (exitCode === 0) {
    return { passed: 1, failed: 0, errors: 0 };
  }
  return { passed: 0, failed: 0, errors: 1 };
}
