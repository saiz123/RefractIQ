import { describe, it, expect } from 'vitest';
import { truncateDiff, extractFailingSummary } from '../diff.js';

describe('truncateDiff', () => {
  it('short diff returns unchanged', () => {
    const diff = 'diff --git a/foo.ts b/foo.ts\n@@ -1,3 +1,4 @@\n+added line\n';
    const result = truncateDiff(diff, 1000);
    expect(result).toBe(diff);
  });

  it('long diff cuts to maxTokens * 4 chars', () => {
    const diff = 'x'.repeat(1000);
    const maxTokens = 100; // maxChars = 400
    const result = truncateDiff(diff, maxTokens);
    // Result should be truncated
    expect(result.length).toBeLessThan(diff.length);
  });

  it('appends truncation notice when diff is truncated', () => {
    const diff = 'x'.repeat(1000);
    const result = truncateDiff(diff, 100);
    expect(result).toContain('... (diff truncated to fit token budget)');
  });

  it('tries to cut at hunk boundary (@@)', () => {
    // Build a diff longer than 400 chars (maxTokens=100) with a @@ boundary
    const header = 'diff --git a/foo.ts b/foo.ts\n';
    const hunk1 = '@@ -1,3 +1,4 @@\n' + 'a'.repeat(100) + '\n';
    const hunk2 = '\n@@ -10,3 +10,4 @@\n' + 'b'.repeat(200) + '\n';
    const diff = header + hunk1 + hunk2;
    // maxTokens=50 → maxChars=200, so it will truncate
    const result = truncateDiff(diff, 50);
    // Should cut at the \n@@ boundary, not mid-word
    if (result.includes('\n@@')) {
      // Cut before the second hunk
      const idx = result.indexOf('\n@@');
      expect(result.substring(0, idx)).not.toContain('bbb');
    }
    expect(result).toContain('... (diff truncated to fit token budget)');
  });
});

describe('extractFailingSummary', () => {
  it('with empty string returns empty string', () => {
    expect(extractFailingSummary('')).toBe('');
  });

  it('keeps lines with FAIL', () => {
    const output = 'FAIL src/test.ts\nsome other line\n';
    const result = extractFailingSummary(output);
    expect(result).toContain('FAIL src/test.ts');
    expect(result).not.toContain('some other line');
  });

  it('keeps lines with Error:', () => {
    const output = 'starting tests\nError: something broke\nall done\n';
    const result = extractFailingSummary(output);
    expect(result).toContain('Error: something broke');
    expect(result).not.toContain('starting tests');
    expect(result).not.toContain('all done');
  });

  it('keeps lines with Expected and Received', () => {
    const output = [
      'Test suite results:',
      'Expected: 42',
      'Received: 0',
      'at Object.<anonymous>',
      'done',
    ].join('\n');
    const result = extractFailingSummary(output);
    expect(result).toContain('Expected: 42');
    expect(result).toContain('Received: 0');
    expect(result).not.toContain('Test suite results:');
    expect(result).not.toContain('done');
  });

  it('limits output to 50 lines', () => {
    // Create 100 lines all with FAIL
    const output = Array.from({ length: 100 }, (_, i) => `FAIL test${i}`).join('\n');
    const result = extractFailingSummary(output);
    const lines = result.split('\n');
    expect(lines.length).toBeLessThanOrEqual(50);
  });
});
