import { describe, it, expect } from 'vitest';
import {
  RefractIQError,
  ProviderError,
  NoCapableModelError,
  BudgetExceededError,
  WorkspaceSecurityError,
  CommandBlockedError,
  InitError,
} from '../errors.js';

describe('RefractIQError', () => {
  it('has correct code and name', () => {
    const err = new RefractIQError('something went wrong', 'TEST_CODE');
    expect(err.code).toBe('TEST_CODE');
    expect(err.name).toBe('RefractIQError');
    expect(err.message).toBe('something went wrong');
    expect(err instanceof Error).toBe(true);
  });
});

describe('ProviderError', () => {
  it('has correct code, name, and provider', () => {
    const err = new ProviderError('provider failed', 'anthropic');
    expect(err.code).toBe('PROVIDER_ERROR');
    expect(err.name).toBe('ProviderError');
    expect(err.provider).toBe('anthropic');
    expect(err.message).toBe('provider failed');
  });
});

describe('NoCapableModelError', () => {
  it('has correct code and name', () => {
    const err = new NoCapableModelError('build', ['anthropic', 'openai']);
    expect(err.code).toBe('NO_CAPABLE_MODEL');
    expect(err.name).toBe('NoCapableModelError');
    expect(err.taskType).toBe('build');
  });

  it('lists tried providers in message', () => {
    const tried = ['anthropic', 'openai', 'gemini'];
    const err = new NoCapableModelError('repair', tried);
    expect(err.message).toContain('repair');
    expect(err.message).toContain('anthropic');
    expect(err.message).toContain('openai');
    expect(err.message).toContain('gemini');
    expect(err.tried).toEqual(tried);
  });
});

describe('BudgetExceededError', () => {
  it('has correct code and name', () => {
    const err = new BudgetExceededError(1.0, 1.5);
    expect(err.code).toBe('BUDGET_EXCEEDED');
    expect(err.name).toBe('BudgetExceededError');
  });

  it('formats amounts correctly', () => {
    const err = new BudgetExceededError(1.0, 1.23456789);
    expect(err.message).toContain('$1');
    expect(err.message).toContain('1.2346');
    expect(err.limitUsd).toBe(1.0);
    expect(err.estimatedUsd).toBe(1.23456789);
  });
});

describe('WorkspaceSecurityError', () => {
  it('has correct code, name, and attemptedPath', () => {
    const err = new WorkspaceSecurityError('../etc/passwd');
    expect(err.code).toBe('WORKSPACE_SECURITY');
    expect(err.name).toBe('WorkspaceSecurityError');
    expect(err.attemptedPath).toBe('../etc/passwd');
    expect(err.message).toContain('../etc/passwd');
  });
});

describe('CommandBlockedError', () => {
  it('has correct code, name, and command', () => {
    const err = new CommandBlockedError('rm -rf /');
    expect(err.code).toBe('COMMAND_BLOCKED');
    expect(err.name).toBe('CommandBlockedError');
    expect(err.command).toBe('rm -rf /');
    expect(err.message).toContain('rm -rf /');
  });
});

describe('InitError', () => {
  it('has correct code and name', () => {
    const err = new InitError('not initialized');
    expect(err.code).toBe('INIT_ERROR');
    expect(err.name).toBe('InitError');
    expect(err.message).toBe('not initialized');
  });
});
