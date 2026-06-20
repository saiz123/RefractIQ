import { resolve, normalize, relative } from 'node:path';
import { WorkspaceSecurityError, CommandBlockedError } from '@refractiq/shared';

/**
 * Resolve a user-provided path relative to rootDir.
 * Throws WorkspaceSecurityError if the resolved path escapes rootDir.
 */
export function safePath(rootDir: string, userPath: string): string {
  const resolved = resolve(rootDir, normalize(userPath));
  const rel = relative(rootDir, resolved);
  // If relative path starts with '..' it has escaped rootDir
  if (rel.startsWith('..') || resolve(rootDir, rel) !== resolved) {
    throw new WorkspaceSecurityError(userPath);
  }
  return resolved;
}

/**
 * Default command allowlist.
 * Only commands whose first token (before any space) appear here are permitted.
 */
export const DEFAULT_ALLOWED_COMMANDS = new Set([
  'npm',
  'npx',
  'pnpm',
  'node',
  'python',
  'python3',
  'pytest',
  'go',
  'cargo',
  'make',
  'vitest',
  'jest',
  'tsc',
  'tsx',
  'ts-node',
  'deno',
  'bun',
]);

/** Shell metacharacters that are always blocked regardless of allowlist */
const BLOCKED_PATTERNS = [
  /[;&|`$<>]/, // shell metacharacters
  /\.\.[/\\]/, // path traversal
  /rm\s+-rf/i, // destructive delete
  /curl\s/i, // network
  /wget\s/i, // network
  /powershell/i, // shell escalation
  /cmd\.exe/i, // shell escalation
  /bash\s+-c/i, // shell escalation
];

/**
 * Validate a command string against the allowlist and blocked patterns.
 * Throws CommandBlockedError if the command is not permitted.
 */
export function validateCommand(
  command: string,
  allowedCommands: Set<string> = DEFAULT_ALLOWED_COMMANDS
): void {
  // Check for blocked patterns first (before any allowlist check)
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      throw new CommandBlockedError(command);
    }
  }

  // Extract the first token (the executable)
  const firstToken = command.trim().split(/\s+/)[0]?.toLowerCase() ?? '';

  if (!allowedCommands.has(firstToken)) {
    throw new CommandBlockedError(command);
  }
}

const SAFE_ENV_KEYS = new Set([
  'PATH',
  'HOME',
  'TMPDIR',
  'TEMP',
  'TMP',
  'NODE_ENV',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'PWD',
  'SHELL',
  'USERPROFILE',
  'SYSTEMROOT',
  'WINDIR', // Windows
  'TERM',
  'COLORTERM',
]);

const SENSITIVE_KEY_PATTERNS = [
  /KEY$/i,
  /TOKEN$/i,
  /SECRET$/i,
  /PASSWORD$/i,
  /PASSWD$/i,
  /AUTH$/i,
  /CREDENTIAL$/i,
  /BEARER$/i,
  /APIKEY/i,
  /API_KEY/i,
];

/**
 * Returns a sanitized environment for child process execution.
 * Strips API keys, tokens, and other secrets from process.env.
 * Only passes through a safe allowlist plus explicitly provided extras.
 */
export function createSanitizedEnv(extra?: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (!value) continue;
    if (SAFE_ENV_KEYS.has(key)) {
      result[key] = value;
    } else if (!SENSITIVE_KEY_PATTERNS.some((p) => p.test(key))) {
      result[key] = value;
    }
  }

  // Merge in extra vars (e.g. NODE_PATH for the generated project)
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      result[key] = value;
    }
  }

  return result;
}
