import { describe, it, expect } from 'vitest';
import { resolve, join } from 'node:path';
import { safePath, validateCommand, DEFAULT_ALLOWED_COMMANDS } from '../security.js';
import { WorkspaceSecurityError, CommandBlockedError } from '@agentforge/shared';

// Use an absolute path that works on both Unix and Windows
const ROOT = resolve('/workspace');

describe('safePath', () => {
  it('resolves a safe relative path', () => {
    const result = safePath(ROOT, 'src/index.ts');
    expect(result).toBe(join(ROOT, 'src', 'index.ts'));
  });

  it('throws on path traversal with ../', () => {
    expect(() => safePath(ROOT, '../etc/passwd')).toThrow(WorkspaceSecurityError);
  });

  it('throws on path traversal with nested ../', () => {
    expect(() => safePath(ROOT, 'src/../../etc/passwd')).toThrow(WorkspaceSecurityError);
  });

  it('throws on absolute path escaping rootDir', () => {
    // An absolute path to something outside ROOT should be blocked
    expect(() => safePath(ROOT, resolve('/etc/passwd'))).toThrow(WorkspaceSecurityError);
  });

  it('allows nested safe paths', () => {
    const result = safePath(ROOT, 'packages/shared/src/index.ts');
    expect(result).toBe(join(ROOT, 'packages', 'shared', 'src', 'index.ts'));
  });

  it('allows path equal to rootDir itself', () => {
    const result = safePath(ROOT, '.');
    expect(result).toBe(ROOT);
  });
});

describe('validateCommand', () => {
  it('allows npm', () => {
    expect(() => validateCommand('npm install')).not.toThrow();
  });

  it('allows npx vitest run', () => {
    expect(() => validateCommand('npx vitest run')).not.toThrow();
  });

  it('blocks unknown command', () => {
    expect(() => validateCommand('ruby script.rb')).toThrow(CommandBlockedError);
  });

  it('blocks semicolon injection', () => {
    expect(() => validateCommand('npm install; rm -rf /')).toThrow(CommandBlockedError);
  });

  it('blocks pipe character', () => {
    expect(() => validateCommand('npm install | cat /etc/passwd')).toThrow(CommandBlockedError);
  });

  it('blocks rm -rf', () => {
    expect(() => validateCommand('rm -rf /workspace')).toThrow(CommandBlockedError);
  });
});
