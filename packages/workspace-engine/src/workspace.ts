import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { safePath } from './security.js';
import type { FileWrite } from '@refractiq/shared';
import { WorkspaceSecurityError } from '@refractiq/shared';

export interface WorkspaceFile {
  path: string;
  content: string;
  sizeBytes: number;
  lastModifiedMs: number;
}

export class Workspace {
  constructor(readonly rootDir: string) {}

  readFile(relativePath: string): string {
    const abs = safePath(this.rootDir, relativePath);
    return readFileSync(abs, 'utf8');
  }

  writeFile(relativePath: string, content: string): void {
    const abs = safePath(this.rootDir, relativePath);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }

  applyWrites(writes: FileWrite[]): void {
    for (const w of writes) {
      if (w.action === 'delete') {
        try {
          const abs = safePath(this.rootDir, w.path);
          if (existsSync(abs)) {
            unlinkSync(abs);
          }
        } catch (err) {
          if (!(err instanceof WorkspaceSecurityError)) throw err;
          throw err; // re-throw security errors
        }
        continue;
      }
      this.writeFile(w.path, w.content);
    }
  }

  exists(relativePath: string): boolean {
    try {
      const abs = safePath(this.rootDir, relativePath);
      return existsSync(abs);
    } catch {
      return false;
    }
  }

  /**
   * Recursively list all files in the workspace as WorkspaceFile objects.
   * Skips node_modules, dist, .git, .refractiq by default.
   */
  listFiles(
    skipDirs = ['node_modules', 'dist', '.git', '.refractiq', 'coverage']
  ): WorkspaceFile[] {
    const entries: WorkspaceFile[] = [];
    this.walkDir(this.rootDir, this.rootDir, skipDirs, entries);
    return entries;
  }

  private walkDir(
    rootDir: string,
    currentDir: string,
    skipDirs: string[],
    entries: WorkspaceFile[]
  ): void {
    let items: string[];
    try {
      items = readdirSync(currentDir);
    } catch {
      return;
    }

    for (const item of items) {
      if (skipDirs.includes(item)) continue;
      const abs = join(currentDir, item);
      let stat;
      try {
        stat = statSync(abs);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        this.walkDir(rootDir, abs, skipDirs, entries);
      } else {
        let content = '';
        try {
          content = readFileSync(abs, 'utf8');
        } catch {
          continue; // skip binary files
        }
        const relativePath = abs.slice(rootDir.length + 1).replace(/\\/g, '/');
        entries.push({
          path: relativePath,
          content,
          sizeBytes: stat.size,
          lastModifiedMs: stat.mtimeMs,
        });
      }
    }
  }
}
