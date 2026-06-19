import { describe, it, expect, vi } from 'vitest';
import { scoreFile, extractKeywords } from '../scorer.js';
import type { FileEntry } from '../types.js';

function makeFile(
  path: string,
  content: string,
  lastModifiedMs?: number,
): FileEntry {
  return { path, content, sizeBytes: content.length, lastModifiedMs };
}

describe('extractKeywords', () => {
  it('includes "todostore" and "database" from "TodoStore database"', () => {
    const kws = extractKeywords('TodoStore database');
    expect(kws).toContain('todostore');
    expect(kws).toContain('database');
  });

  it('filters words shorter than 4 chars', () => {
    const kws = extractKeywords('add the foo to bar via api');
    // "add", "the", "foo", "bar", "via", "api" are all short/stop words
    for (const kw of kws) {
      expect(kw.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('deduplicates words', () => {
    const kws = extractKeywords('store store store');
    const count = kws.filter((k) => k === 'store').length;
    expect(count).toBe(1);
  });
});

describe('scoreFile', () => {
  it('returns score 0 when no keyword matches', () => {
    const file = makeFile('src/widget.ts', 'export function widgetHelper() {}');
    const result = scoreFile(file, 'authenticate user login session');
    // .ts gets +5 code file bonus, but no keyword match for 'authenticate', 'user', 'login', 'session'
    // Actually 'user' is <4 chars, 'login' not a stop word, 'session' not a stop word
    // The task says score 0 for "completely irrelevant" so let's test with a truly irrelevant task
    const result2 = scoreFile(makeFile('src/widget.ts', 'export const x = 1;'), 'aaaa bbbb cccc');
    // 'aaaa', 'bbbb', 'cccc' not in file content or path
    expect(result2.score).toBe(5); // still gets code file bonus
    // For truly zero score, use a non-code file
    const pngFile = makeFile('assets/logo.gif', 'binary data here');
    const result3 = scoreFile(pngFile, 'aaaa bbbb cccc');
    expect(result3.score).toBe(0);
  });

  it('includes +10 for keyword found in path', () => {
    const file = makeFile('src/todostore.ts', 'export const x = 1;');
    const result = scoreFile(file, 'TodoStore component');
    expect(result.score).toBeGreaterThanOrEqual(10);
    expect(result.reasons.some((r) => r.includes('keyword in path'))).toBe(true);
  });

  it('includes +2 per keyword found in content (capped at 40)', () => {
    // Create content with many distinct keywords
    const keywords = Array.from({ length: 25 }, (_, i) => `keyword${i + 1000}`);
    const content = keywords.join(' ');
    const task = keywords.join(' ');
    const file = makeFile('readme.md', content); // non-code file, no extension bonus
    const result = scoreFile(file, task);
    // Content score capped at 40
    expect(result.score).toBeLessThanOrEqual(40);
    expect(result.reasons.some((r) => r.includes('keyword in content'))).toBe(true);
  });

  it('includes +5 code file bonus for .ts files', () => {
    const file = makeFile('src/store.ts', 'export const x = 1;');
    // Use a task with no keyword matches to isolate the code bonus
    const result = scoreFile(file, 'aaaa bbbb cccc dddd');
    // Only code file bonus (since no keywords match)
    expect(result.score).toBe(5);
    expect(result.reasons).toContain('code file bonus');
  });

  it('does not include extension bonus for .png files', () => {
    const file = makeFile('assets/image.png', 'binary');
    const result = scoreFile(file, 'aaaa bbbb cccc dddd');
    expect(result.score).toBe(0);
    expect(result.reasons).not.toContain('code file bonus');
  });

  it('includes recency bonus for recently modified files', () => {
    const recentMs = Date.now() - 60_000; // 1 minute ago
    const file = makeFile('src/store.ts', 'export const x = 1;', recentMs);
    const result = scoreFile(file, 'aaaa bbbb cccc dddd');
    expect(result.score).toBe(8); // 5 (code) + 3 (recent)
    expect(result.reasons).toContain('recently modified');
  });

  it('does not include recency bonus for old files', () => {
    const oldMs = Date.now() - 7_200_000; // 2 hours ago
    const file = makeFile('src/store.ts', 'export const x = 1;', oldMs);
    const result = scoreFile(file, 'aaaa bbbb cccc dddd');
    expect(result.score).toBe(5); // only code file bonus
    expect(result.reasons).not.toContain('recently modified');
  });

  it('returns reasons array explaining the score', () => {
    const file = makeFile('src/todostore.ts', 'export const store = new TodoStore();');
    const result = scoreFile(file, 'TodoStore component');
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('scoreFile result contains the file reference', () => {
    const file = makeFile('src/auth.ts', 'export function authenticate() {}');
    const result = scoreFile(file, 'authenticate users');
    expect(result.file).toBe(file);
  });
});
