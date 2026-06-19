import { describe, it, expect } from 'vitest';
import { chunkFile } from '../chunker.js';
import type { FileEntry } from '../types.js';

function makeFile(path: string, content: string): FileEntry {
  return { path, content, sizeBytes: content.length };
}

// estimateTokens: Math.ceil(length / 4)
// So for maxTokens=100, maxChars = 400

describe('chunkFile', () => {
  it('small file (under maxTokens) returns single chunk with full content', () => {
    const content = 'const x = 1;\nconst y = 2;\n';
    const file = makeFile('src/small.ts', content);
    const chunks = chunkFile(file, 1000);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe(content);
    expect(chunks[0].path).toBe('src/small.ts');
    expect(chunks[0].startLine).toBe(1);
  });

  it('large file returns multiple chunks', () => {
    // Create a file with clearly separated function declarations
    const fn = (name: string) => `function ${name}() {\n  return '${name.repeat(10)}';\n}\n`;
    // Each function will be ~100 chars, so ~25 tokens. maxTokens=30 should split.
    const parts = [fn('alpha'), fn('beta'), fn('gamma'), fn('delta')];
    const content = parts[0] + '\n' + parts[1] + '\n' + parts[2] + '\n' + parts[3];
    const file = makeFile('src/large.ts', content);
    // maxTokens=30 (120 chars): each function block is ~100 chars so fits alone but not together
    const chunks = chunkFile(file, 30);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('each chunk tokenEstimate is <= maxTokens', () => {
    const fn = (name: string) => `function ${name}() {\n  return '${name.repeat(8)}';\n}\n`;
    const content = Array.from({ length: 6 }, (_, i) => fn(`func${i}`)).join('\n');
    const file = makeFile('src/funcs.ts', content);
    const maxTokens = 30;
    const chunks = chunkFile(file, maxTokens);
    for (const chunk of chunks) {
      expect(chunk.tokenEstimate).toBeLessThanOrEqual(maxTokens);
    }
  });

  it('chunk startLine and endLine are correct (1-indexed)', () => {
    const content = 'line1\nline2\nline3\n';
    const file = makeFile('src/lines.ts', content);
    const chunks = chunkFile(file, 1000);
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].endLine).toBe(content.split('\n').length);
  });

  it('very large single block is truncated with truncated notice', () => {
    // A single block with no split points that exceeds maxTokens
    const bigContent = 'x'.repeat(500); // 500 chars = 125 tokens
    const file = makeFile('src/big.ts', bigContent);
    const chunks = chunkFile(file, 50); // maxTokens=50, maxChars=200
    // Should have at least one chunk with truncation notice
    const allContent = chunks.map((c) => c.content).join('');
    expect(allContent).toContain('// ... (truncated)');
  });

  it('chunks from the same file all have the same path', () => {
    const fn = (name: string) => `function ${name}() {\n  return '${name.repeat(10)}';\n}\n`;
    const content = Array.from({ length: 4 }, (_, i) => fn(`fn${i}`)).join('\n');
    const file = makeFile('src/multi.ts', content);
    const chunks = chunkFile(file, 30);
    for (const chunk of chunks) {
      expect(chunk.path).toBe('src/multi.ts');
    }
  });

  it('empty file content returns single chunk', () => {
    const file = makeFile('src/empty.ts', '');
    const chunks = chunkFile(file, 100);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].startLine).toBe(1);
  });

  it('file with blank-line-separated functions splits at function boundaries', () => {
    const content = [
      'function alpha() {',
      '  return 1;',
      '}',
      '',
      'function beta() {',
      '  return 2;',
      '}',
      '',
      'function gamma() {',
      '  return 3;',
      '}',
    ].join('\n');
    const file = makeFile('src/funcs.ts', content);
    // Total chars ~120, ~30 tokens. Set maxTokens=15 to force splitting
    const chunks = chunkFile(file, 15);
    // Should produce multiple chunks since total > 15 tokens
    expect(chunks.length).toBeGreaterThan(1);
    // Verify that different functions end up in different chunks
    const firstChunk = chunks[0].content;
    const lastChunk = chunks[chunks.length - 1].content;
    expect(firstChunk).not.toBe(lastChunk);
  });
});
