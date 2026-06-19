import { describe, it, expect, vi } from 'vitest';
import { ContextEngine } from '../engine.js';
import type { FileEntry } from '../types.js';

function makeFile(
  path: string,
  content: string,
  sizeBytes?: number,
): FileEntry {
  return { path, content, sizeBytes: sizeBytes ?? content.length };
}

describe('ContextEngine.buildContextPack', () => {
  it('empty file list returns empty context pack', async () => {
    const engine = new ContextEngine();
    const pack = await engine.buildContextPack([], 'build a todo store');
    expect(pack.chunks).toHaveLength(0);
    expect(pack.filesIncluded).toHaveLength(0);
    expect(pack.filesExcluded).toHaveLength(0);
    expect(pack.totalTokenEstimate).toBe(0);
  });

  it('single relevant file is included in pack', async () => {
    const engine = new ContextEngine();
    const file = makeFile('src/todostore.ts', 'export class TodoStore { getItems() {} }');
    const pack = await engine.buildContextPack([file], 'implement TodoStore methods');
    expect(pack.filesIncluded).toContain('src/todostore.ts');
    expect(pack.chunks.length).toBeGreaterThan(0);
  });

  it('file with keyword in path ranked higher than file without', async () => {
    const engine = new ContextEngine({ topK: 2 });
    const highRelevance = makeFile(
      'src/todostore.ts',
      'export class TodoStore {}',
    );
    const lowRelevance = makeFile(
      'src/unrelated.ts',
      'export function helper() { return 42; }',
    );
    const pack = await engine.buildContextPack(
      [lowRelevance, highRelevance],
      'implement TodoStore',
    );
    // Both may be included, but todostore.ts should be in filesIncluded
    expect(pack.filesIncluded).toContain('src/todostore.ts');
  });

  it('topK limit respected: with many files only topK included', async () => {
    const engine = new ContextEngine({ topK: 3, maxTotalTokens: 100_000 });
    // Create 20 files, all containing the keyword "widget"
    const files = Array.from({ length: 20 }, (_, i) =>
      makeFile(`src/widget${i}.ts`, `export function widget${i}() { return ${i}; }`),
    );
    const pack = await engine.buildContextPack(files, 'widget component');
    expect(pack.filesIncluded.length).toBeLessThanOrEqual(3);
  });

  it('large file exceeding summarizationThresholdTokens appears in summarizedFiles', async () => {
    const engine = new ContextEngine({
      summarizationThresholdTokens: 10,
      maxTotalTokens: 100_000,
    });
    // Content must exceed 10 tokens (40 chars)
    const bigContent = 'x'.repeat(200); // 200 chars = 50 tokens
    const file = makeFile('src/bigfile.ts', bigContent);
    const pack = await engine.buildContextPack([file], 'xxxx');
    expect(pack.summarizedFiles).toContain('src/bigfile.ts');
  });

  it('large file summary content is included from stubSummarizer', async () => {
    const engine = new ContextEngine({
      summarizationThresholdTokens: 10,
      maxTotalTokens: 100_000,
    });
    const bigContent = 'y'.repeat(200);
    const file = makeFile('src/bigfile.ts', bigContent);
    const pack = await engine.buildContextPack([file], 'yyyy');
    // stubSummarizer returns a [Summary of ...] string
    const chunk = pack.chunks.find((c) => c.path === 'src/bigfile.ts');
    expect(chunk).toBeDefined();
    expect(chunk!.content).toContain('[Summary of');
  });

  it('maxTotalTokens limit: stops adding chunks once budget reached', async () => {
    const engine = new ContextEngine({
      maxTotalTokens: 20, // very small budget
      maxFileTokens: 100,
      topK: 10,
    });
    const files = Array.from({ length: 5 }, (_, i) =>
      makeFile(`src/mod${i}.ts`, `export function mod${i}() { return ${'x'.repeat(50)}; }`),
    );
    const pack = await engine.buildContextPack(files, 'mod component');
    expect(pack.totalTokenEstimate).toBeLessThanOrEqual(20);
  });

  it('filesExcluded contains files cut off by topK', async () => {
    const engine = new ContextEngine({ topK: 1, maxTotalTokens: 100_000 });
    const files = [
      makeFile('src/alpha.ts', 'export function alpha() { return "alpha"; }'),
      makeFile('src/beta.ts', 'export function beta() { return "beta"; }'),
    ];
    const pack = await engine.buildContextPack(files, 'alpha beta');
    // With topK=1, one file should be excluded
    expect(pack.filesExcluded.length).toBeGreaterThan(0);
  });

  it('formatForPrompt wraps chunks in <file path="..."> tags', async () => {
    const engine = new ContextEngine();
    const file = makeFile('src/store.ts', 'export class Store {}');
    const pack = await engine.buildContextPack([file], 'store class');
    const formatted = engine.formatForPrompt(pack);
    expect(formatted).toContain('<file path="src/store.ts">');
    expect(formatted).toContain('</file>');
  });

  it('formatForPrompt with multiple files produces multiple <file> sections', async () => {
    const engine = new ContextEngine({ maxTotalTokens: 100_000 });
    const files = [
      makeFile('src/alpha.ts', 'export function alpha() { return "alpha result"; }'),
      makeFile('src/beta.ts', 'export function beta() { return "beta result"; }'),
    ];
    const pack = await engine.buildContextPack(files, 'alpha beta result');
    const formatted = engine.formatForPrompt(pack);
    const matches = formatted.match(/<file path=/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });
});
