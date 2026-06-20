import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GitManager } from '../git.js';
import { CommandBlockedError } from '@refractiq/shared';

describe('GitManager', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'refractiq-git-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('isRepo() returns false for non-git dir', () => {
    const git = new GitManager(tmpDir);
    expect(git.isRepo()).toBe(false);
  });

  it('init() creates a git repo', () => {
    const git = new GitManager(tmpDir);
    git.init();
    expect(git.isRepo()).toBe(true);
  });

  it('validateBranchName throws on semicolon injection', () => {
    const git = new GitManager(tmpDir);
    expect(() => git.createBranch('; rm -rf /')).toThrow(CommandBlockedError);
  });

  it('validateBranchName throws on backtick injection', () => {
    const git = new GitManager(tmpDir);
    expect(() => git.createBranch('`whoami`')).toThrow(CommandBlockedError);
  });

  it('validateBranchName throws on double-dot traversal', () => {
    const git = new GitManager(tmpDir);
    expect(() => git.createBranch('../evil')).toThrow(CommandBlockedError);
  });
});
