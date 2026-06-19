import type { FileEntry, FileIndex } from './types.js';

/**
 * Build an in-memory index of workspace files.
 * Skips binary files, node_modules, dist/, .git/, and files over 500KB.
 */
export function buildFileIndex(files: FileEntry[]): FileIndex {
  const filtered = files.filter((f) => !shouldSkip(f));
  return {
    files: filtered,
    totalSizeBytes: filtered.reduce((sum, f) => sum + f.sizeBytes, 0),
    indexedAt: Date.now(),
  };
}

const SKIP_PATHS = ['node_modules/', 'dist/', '.git/', '.agentforge/', 'coverage/'];
const SKIP_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.mp4',
  '.mp3',
  '.zip',
  '.tar',
  '.gz',
  '.lock',
];
const MAX_FILE_BYTES = 500 * 1024; // 500KB

export function shouldSkip(file: FileEntry): boolean {
  if (file.sizeBytes > MAX_FILE_BYTES) return true;
  if (SKIP_PATHS.some((p) => file.path.includes(p))) return true;
  if (SKIP_EXTENSIONS.some((ext) => file.path.endsWith(ext))) return true;
  return false;
}
