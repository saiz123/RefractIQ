import type { FileWriter } from '@refractiq/shared';
import type { FileWrite } from '@refractiq/shared';
import { Workspace } from './workspace.js';
import { GitManager } from './git.js';

export class WorkspaceFileWriter implements FileWriter {
  private workspace: Workspace;
  private git: GitManager;

  constructor(rootDir: string) {
    this.workspace = new Workspace(rootDir);
    this.git = new GitManager(rootDir);

    // Ensure it's a git repo
    if (!this.git.isRepo()) {
      this.git.init();
    }
  }

  async applyWrites(writes: FileWrite[]): Promise<void> {
    this.workspace.applyWrites(writes);
  }

  async getDiff(from?: string, to?: string): Promise<string> {
    return this.git.diff(from, to);
  }

  async commitStage(message: string): Promise<void> {
    this.git.commit(message);
  }

  async listFiles(): Promise<
    Array<{ path: string; content: string; sizeBytes: number; lastModifiedMs?: number }>
  > {
    return this.workspace.listFiles();
  }
}
