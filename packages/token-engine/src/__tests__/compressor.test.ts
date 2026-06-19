import { describe, it, expect } from 'vitest';
import { compressLog } from '../compressor.js';

describe('compressLog', () => {
  it('returns an empty string unchanged', () => {
    expect(compressLog('')).toBe('');
  });

  it('returns a short log unchanged', () => {
    const log = 'Error: something went wrong\n  at foo (file.js:1:1)';
    const result = compressLog(log);
    expect(result).toContain('Error: something went wrong');
    expect(result).toContain('at foo');
  });

  it('truncates stack traces to 5 frames and adds truncation notice', () => {
    const lines = [
      'Error: test error',
      '    at frame1 (a.js:1:1)',
      '    at frame2 (a.js:2:1)',
      '    at frame3 (a.js:3:1)',
      '    at frame4 (a.js:4:1)',
      '    at frame5 (a.js:5:1)',
      '    at frame6 (a.js:6:1)',
      '    at frame7 (a.js:7:1)',
      '    at frame8 (a.js:8:1)',
      '    at frame9 (a.js:9:1)',
      '    at frame10 (a.js:10:1)',
    ];
    const result = compressLog(lines.join('\n'));
    expect(result).toContain('at frame1');
    expect(result).toContain('at frame5');
    expect(result).not.toContain('at frame6');
    expect(result).toContain('... (stack truncated)');
  });

  it('deduplicates identical consecutive lines', () => {
    const lines = ['Error: repeated', 'Error: repeated', 'Error: repeated', 'Different line'];
    const result = compressLog(lines.join('\n'));
    const occurrences = (result.match(/Error: repeated/g) ?? []).length;
    expect(occurrences).toBe(1);
    expect(result).toContain('repeated');
    expect(result).toContain('Different line');
  });

  it('caps output at 8000 chars (2000 tokens * 4) with truncation suffix', () => {
    const longLog = 'a'.repeat(9000);
    const result = compressLog(longLog);
    expect(result.length).toBeLessThanOrEqual(8000 + 50); // allow for truncation message
    expect(result).toContain('... (log truncated to 2000 tokens)');
  });

  it('does not truncate logs that are exactly at the limit', () => {
    const log = 'a'.repeat(8000);
    const result = compressLog(log);
    expect(result).not.toContain('truncated');
    expect(result.length).toBe(8000);
  });
});
