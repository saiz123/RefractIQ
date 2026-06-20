import { CommandRunner } from './runner.js';
import { validateCommand } from './security.js';
import { compressLog } from '@refractiq/token-engine';
import type { TestRunner, TestArtifact } from '@refractiq/shared';

export interface SandboxRunOptions {
  cwd: string;
  timeoutMs?: number;
}

const DOCKER_IMAGE_MAP: Array<{ pattern: RegExp; image: string }> = [
  {
    pattern: /^(npm|npx|pnpm|node|vitest|jest|tsc|tsx|ts-node|bun|deno)(\s|$)/,
    image: 'node:22-alpine',
  },
  { pattern: /^(python|python3|pytest|pip)(\s|$)/, image: 'python:3.12-slim' },
  { pattern: /^go(\s|$)/, image: 'golang:1.22-alpine' },
  { pattern: /^cargo(\s|$)/, image: 'rust:1.78-slim' },
  { pattern: /^make(\s|$)/, image: 'ubuntu:22.04' },
];

/**
 * Minimal test output parser for sandbox results.
 * Supports vitest, jest, pytest, and go test output patterns.
 */
function parseSandboxTestOutput(
  stdout: string,
  stderr: string,
  exitCode: number
): { passed: number; failed: number; errors: number } {
  const combined = stdout + '\n' + stderr;

  // Go test pattern
  if (combined.includes('ok  \t') || combined.includes('--- PASS')) {
    const goFailed = (combined.match(/--- FAIL/g) ?? []).length;
    const goPassed = (combined.match(/--- PASS/g) ?? []).length;
    return { passed: goPassed, failed: goFailed, errors: 0 };
  }

  // vitest / jest pattern
  const vitestPassed = combined.match(/(\d+)\s+passed/i);
  const vitestFailed = combined.match(/(\d+)\s+failed/i);
  if (vitestPassed || vitestFailed) {
    const errMatch = combined.match(/(\d+)\s+errors?/i);
    return {
      passed: vitestPassed ? parseInt(vitestPassed[1]!, 10) : 0,
      failed: vitestFailed ? parseInt(vitestFailed[1]!, 10) : 0,
      errors: errMatch ? parseInt(errMatch[1]!, 10) : 0,
    };
  }

  // pytest pattern
  const pytestMatch = combined.match(/(\d+) passed(?:,\s*(\d+) failed)?(?:,\s*(\d+) errors?)?/i);
  if (pytestMatch) {
    return {
      passed: parseInt(pytestMatch[1] ?? '0', 10),
      failed: parseInt(pytestMatch[2] ?? '0', 10),
      errors: parseInt(pytestMatch[3] ?? '0', 10),
    };
  }

  // Fallback: exit code
  if (exitCode === 0) {
    return { passed: 1, failed: 0, errors: 0 };
  }
  return { passed: 0, failed: 0, errors: 1 };
}

/**
 * Runs test/build commands inside a Docker container for isolation.
 * Requires Docker to be installed on the host.
 * Network access is disabled inside the container.
 * Implements TestRunner so it can be used as a drop-in replacement.
 */
export class SandboxRunner implements TestRunner {
  private runner = new CommandRunner();
  private workingDir: string;

  constructor(workingDir: string) {
    this.workingDir = workingDir;
  }

  selectImage(command: string): string {
    const trimmed = command.trim();
    for (const { pattern, image } of DOCKER_IMAGE_MAP) {
      if (pattern.test(trimmed)) return image;
    }
    return 'ubuntu:22.04';
  }

  async run(command: string): Promise<TestArtifact> {
    validateCommand(command);

    const image = this.selectImage(command);
    const escapedCmd = command.replace(/'/g, "'\\''");
    const dockerCmd = `docker run --rm --network none --memory 512m --cpus 1.0 -v ${this.workingDir}:/workspace -w /workspace ${image} sh -c '${escapedCmd}'`;

    const result = this.runner.run(dockerCmd, {
      cwd: '/',
      timeoutMs: 120_000,
      allowedCommands: new Set(['docker']),
    });

    const rawLog = [result.stdout, result.stderr].filter(Boolean).join('\n');
    const parsed = parseSandboxTestOutput(result.stdout, result.stderr, result.exitCode);

    return {
      passed: parsed.passed,
      failed: parsed.failed,
      errors: parsed.errors,
      compressedLog: compressLog(rawLog),
      rawExitCode: result.exitCode,
      testCommand: command,
    };
  }
}
