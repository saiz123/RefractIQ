import { describe, it, expect } from 'vitest';
import { parseTestOutput } from '../parser.js';

describe('parseTestOutput', () => {
  it('parses vitest "2 passed" output', () => {
    const result = parseTestOutput('Tests  2 passed (2)', '', 0);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('parses vitest "1 failed" output', () => {
    const result = parseTestOutput('Tests  1 failed | 3 passed (4)', '', 1);
    expect(result.failed).toBe(1);
    expect(result.passed).toBe(3);
  });

  it('parses jest output', () => {
    const result = parseTestOutput('Tests:       3 passed, 1 failed, 4 total', '', 1);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(1);
  });

  it('parses pytest output', () => {
    const result = parseTestOutput('5 passed, 2 failed, 1 error', '', 1);
    expect(result.passed).toBe(5);
    expect(result.failed).toBe(2);
    expect(result.errors).toBe(1);
  });

  it('parses go test PASS output', () => {
    const result = parseTestOutput('--- PASS: TestFoo\n--- PASS: TestBar\nok  \tpkg', '', 0);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('parses go test FAIL output', () => {
    const result = parseTestOutput('--- FAIL: TestBaz\n--- PASS: TestFoo\nFAIL\tpkg', '', 1);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('falls back to exit code 0 → 1 passed', () => {
    const result = parseTestOutput('', '', 0);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('falls back to exit code 1 → 1 error', () => {
    const result = parseTestOutput('', '', 1);
    expect(result.errors).toBe(1);
    expect(result.passed).toBe(0);
  });

  it('counts stderr in combined output', () => {
    const result = parseTestOutput('', '5 passed', 0);
    expect(result.passed).toBe(5);
  });

  it('returns zero counts for empty output with exit 0', () => {
    const result = parseTestOutput('', '', 0);
    expect(result.failed).toBe(0);
    expect(result.errors).toBe(0);
  });
});
