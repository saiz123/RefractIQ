import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Workspace } from '../workspace.js';
import { WorkspaceSecurityError } from '@refractiq/shared';

describe('Workspace', () => {
  let tmpDir: string;
  let workspace: Workspace;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'refractiq-test-'));
    workspace = new Workspace(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes and reads a file', () => {
    workspace.writeFile('src/index.ts', 'export {};');
    expect(workspace.readFile('src/index.ts')).toBe('export {};');
  });

  it('creates parent directories automatically', () => {
    workspace.writeFile('a/b/c/deep.ts', 'deep');
    expect(workspace.readFile('a/b/c/deep.ts')).toBe('deep');
  });

  it('throws WorkspaceSecurityError on path traversal read', () => {
    expect(() => workspace.readFile('../escape.ts')).toThrow(WorkspaceSecurityError);
  });

  it('throws WorkspaceSecurityError on path traversal write', () => {
    expect(() => workspace.writeFile('../escape.ts', 'bad')).toThrow(WorkspaceSecurityError);
  });

  it('exists() returns true for existing file', () => {
    workspace.writeFile('file.ts', 'x');
    expect(workspace.exists('file.ts')).toBe(true);
  });

  it('exists() returns false for missing file', () => {
    expect(workspace.exists('nope.ts')).toBe(false);
  });

  it('exists() returns false for path traversal (no throw)', () => {
    expect(workspace.exists('../escape.ts')).toBe(false);
  });

  it('applyWrites creates files', () => {
    workspace.applyWrites([
      { path: 'a.ts', content: 'A', action: 'create' },
      { path: 'b.ts', content: 'B', action: 'create' },
    ]);
    expect(workspace.readFile('a.ts')).toBe('A');
    expect(workspace.readFile('b.ts')).toBe('B');
  });

  it('applyWrites deletes files with action delete', () => {
    workspace.writeFile('to-delete.ts', 'content');
    expect(workspace.exists('to-delete.ts')).toBe(true);
    workspace.applyWrites([{ path: 'to-delete.ts', content: '', action: 'delete' }]);
    expect(workspace.exists('to-delete.ts')).toBe(false);
  });

  it('applyWrites delete with path traversal throws WorkspaceSecurityError', () => {
    expect(() =>
      workspace.applyWrites([{ path: '../escape.ts', content: '', action: 'delete' }])
    ).toThrow(WorkspaceSecurityError);
  });
});
