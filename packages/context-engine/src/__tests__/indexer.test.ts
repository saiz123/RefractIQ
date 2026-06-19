import { describe, it, expect } from 'vitest';
import { buildFileIndex, shouldSkip } from '../indexer.js';
import type { FileEntry } from '../types.js';

function makeFile(path: string, sizeBytes: number, content = 'hello'): FileEntry {
  return { path, content, sizeBytes };
}

describe('buildFileIndex', () => {
  it('with empty array returns empty index', () => {
    const index = buildFileIndex([]);
    expect(index.files).toHaveLength(0);
    expect(index.totalSizeBytes).toBe(0);
    expect(index.indexedAt).toBeGreaterThan(0);
  });

  it('filters files inside node_modules/', () => {
    const files = [
      makeFile('node_modules/lodash/index.js', 100),
      makeFile('src/index.ts', 100),
    ];
    const index = buildFileIndex(files);
    expect(index.files).toHaveLength(1);
    expect(index.files[0].path).toBe('src/index.ts');
  });

  it('filters files inside dist/', () => {
    const files = [
      makeFile('dist/index.js', 200),
      makeFile('src/app.ts', 200),
    ];
    const index = buildFileIndex(files);
    expect(index.files).toHaveLength(1);
    expect(index.files[0].path).toBe('src/app.ts');
  });

  it('computes totalSizeBytes from included files only', () => {
    const files = [
      makeFile('src/a.ts', 100),
      makeFile('src/b.ts', 200),
      makeFile('node_modules/pkg/index.js', 999),
    ];
    const index = buildFileIndex(files);
    expect(index.totalSizeBytes).toBe(300);
  });
});

describe('shouldSkip', () => {
  it('returns true for .png extension', () => {
    expect(shouldSkip(makeFile('assets/logo.png', 100))).toBe(true);
  });

  it('returns true for files over 500KB', () => {
    expect(shouldSkip(makeFile('big.ts', 500 * 1024 + 1))).toBe(true);
  });

  it('returns false for a normal .ts file', () => {
    expect(shouldSkip(makeFile('src/index.ts', 1000))).toBe(false);
  });
});
