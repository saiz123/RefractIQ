import { describe, it, expect } from 'vitest';
import { SandboxRunner } from '../sandbox.js';

describe('SandboxRunner', () => {
  it('selectImage returns node image for npm', () => {
    const runner = new SandboxRunner('/tmp');
    expect(runner.selectImage('npm test')).toBe('node:22-alpine');
  });

  it('selectImage returns node image for npx', () => {
    const runner = new SandboxRunner('/tmp');
    expect(runner.selectImage('npx vitest run')).toBe('node:22-alpine');
  });

  it('selectImage returns python image for pytest', () => {
    const runner = new SandboxRunner('/tmp');
    expect(runner.selectImage('pytest')).toBe('python:3.12-slim');
  });

  it('selectImage returns go image for go test', () => {
    const runner = new SandboxRunner('/tmp');
    expect(runner.selectImage('go test ./...')).toBe('golang:1.22-alpine');
  });

  it('selectImage falls back to ubuntu for unknown commands', () => {
    const runner = new SandboxRunner('/tmp');
    expect(runner.selectImage('make test')).toBe('ubuntu:22.04');
  });
});
