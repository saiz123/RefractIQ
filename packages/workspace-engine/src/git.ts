import { execSync, execFileSync } from 'node:child_process';
import { CommandBlockedError } from '@agentforge/shared';

export interface GitStatus {
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
}

export class GitManager {
  constructor(private readonly cwd: string) {}

  isRepo(): boolean {
    try {
      execSync('git rev-parse --git-dir', { cwd: this.cwd, stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  init(): void {
    execSync('git init', { cwd: this.cwd, stdio: 'pipe' });
    execSync('git config user.email "agentforge@local"', { cwd: this.cwd, stdio: 'pipe' });
    execSync('git config user.name "AgentForge"', { cwd: this.cwd, stdio: 'pipe' });
  }

  add(pathSpec = '.'): void {
    execFileSync('git', ['add', pathSpec], { cwd: this.cwd, stdio: 'pipe' });
  }

  commit(message: string): string {
    // Stage all changes
    this.add('.');
    try {
      execFileSync('git', ['commit', '-m', message], { cwd: this.cwd, stdio: 'pipe' });
    } catch {
      // Nothing to commit is not an error
    }
    try {
      const sha = execSync('git rev-parse HEAD', { cwd: this.cwd, stdio: 'pipe' })
        .toString()
        .trim();
      return sha;
    } catch {
      return '';
    }
  }

  diff(from?: string, to?: string): string {
    try {
      if (!from && !to) {
        // Diff of staged + unstaged vs HEAD
        return execSync('git diff HEAD', { cwd: this.cwd, stdio: 'pipe' }).toString();
      }
      if (from && !to) {
        return execFileSync('git', ['diff', from], { cwd: this.cwd, stdio: 'pipe' }).toString();
      }
      return execFileSync('git', ['diff', from!, to!], { cwd: this.cwd, stdio: 'pipe' }).toString();
    } catch {
      return '';
    }
  }

  status(): GitStatus {
    try {
      const raw = execSync('git status --porcelain', { cwd: this.cwd, stdio: 'pipe' }).toString();
      const modified: string[] = [];
      const added: string[] = [];
      const deleted: string[] = [];
      const untracked: string[] = [];

      for (const line of raw.split('\n')) {
        const code = line.slice(0, 2);
        const file = line.slice(3).trim();
        if (!file) continue;
        if (code.includes('M')) modified.push(file);
        else if (code.includes('A') || code === '?? ') added.push(file);
        else if (code.includes('D')) deleted.push(file);
        else if (code === '?? ') untracked.push(file);
      }

      return { modified, added, deleted, untracked };
    } catch {
      return { modified: [], added: [], deleted: [], untracked: [] };
    }
  }

  public validateBranchName(name: string): void {
    if (/\.\.|[ ;`$|&><]/.test(name)) {
      throw new CommandBlockedError(`Invalid branch name: ${name}`);
    }
  }

  createBranch(name: string): void {
    this.validateBranchName(name);
    execFileSync('git', ['checkout', '-b', name], { cwd: this.cwd, stdio: 'pipe' });
  }

  getCurrentBranch(): string {
    try {
      return execSync('git branch --show-current', { cwd: this.cwd, stdio: 'pipe' })
        .toString()
        .trim();
    } catch {
      return 'main';
    }
  }
}
