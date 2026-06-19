import type { TestRunner } from '@agentforge/shared';
import type { TestArtifact } from '@agentforge/shared';
import { CommandRunner } from '@agentforge/workspace-engine';
import { compressLog } from '@agentforge/token-engine';
import { parseTestOutput } from './parser.js';

export class WorkspaceTestRunner implements TestRunner {
  private runner: CommandRunner;

  constructor(
    private readonly cwd: string,
    private readonly allowedCommands?: Set<string>,
  ) {
    this.runner = new CommandRunner();
  }

  async run(command: string): Promise<TestArtifact> {
    const result = this.runner.run(command, {
      cwd: this.cwd,
      timeoutMs: 60_000,
      allowedCommands: this.allowedCommands,
    });

    const rawLog = [result.stdout, result.stderr].filter(Boolean).join('\n');
    const parsed = parseTestOutput(result.stdout, result.stderr, result.exitCode);

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
