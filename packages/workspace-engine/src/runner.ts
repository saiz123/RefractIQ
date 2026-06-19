import { execSync } from 'node:child_process';
import { validateCommand } from './security.js';

export interface RunOptions {
  cwd: string;
  timeoutMs?: number;
  env?: Record<string, string>;
  allowedCommands?: Set<string>;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  command: string;
}

export class CommandRunner {
  run(command: string, opts: RunOptions): RunResult {
    validateCommand(command, opts.allowedCommands);

    const startMs = Date.now();
    let stdout = '';
    let stderr = '';
    let exitCode = 0;

    try {
      const output = execSync(command, {
        cwd: opts.cwd,
        timeout: opts.timeoutMs ?? 30_000,
        env: { ...process.env, ...opts.env },
        stdio: 'pipe',
        encoding: 'utf8',
      });
      stdout = output;
    } catch (err: unknown) {
      exitCode = 1;
      if (err && typeof err === 'object') {
        const spawnErr = err as { stdout?: Buffer | string; stderr?: Buffer | string; status?: number };
        stdout = spawnErr.stdout?.toString() ?? '';
        stderr = spawnErr.stderr?.toString() ?? '';
        exitCode = spawnErr.status ?? 1;
      }
    }

    return {
      stdout,
      stderr,
      exitCode,
      durationMs: Date.now() - startMs,
      command,
    };
  }
}
