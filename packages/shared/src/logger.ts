type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

const REDACT_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9\-]{20,}/g,
  /sk-ant-[A-Za-z0-9\-]{20,}/g,
  /AIza[A-Za-z0-9_\-]{35}/g,
];

export function redactSecrets(text: string): string {
  let result = text;
  for (const pattern of REDACT_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

function getConfiguredLevel(): LogLevel {
  const envLevel = process.env['AGENTFORGE_LOG_LEVEL'];
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel as LogLevel;
  }
  return 'info';
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[getConfiguredLevel()];
}

function formatData(data: unknown): string {
  if (data === undefined) return '';
  try {
    return ' ' + JSON.stringify(data);
  } catch {
    return ' ' + String(data);
  }
}

export const logger = {
  error(msg: string, data?: unknown): void {
    if (!shouldLog('error')) return;
    const redacted = redactSecrets(msg);
    process.stderr.write(`[ERROR] ${redacted}${formatData(data)}\n`);
  },

  warn(msg: string, data?: unknown): void {
    if (!shouldLog('warn')) return;
    const redacted = redactSecrets(msg);
    process.stderr.write(`[WARN] ${redacted}${formatData(data)}\n`);
  },

  info(msg: string, data?: unknown): void {
    if (!shouldLog('info')) return;
    const redacted = redactSecrets(msg);
    process.stdout.write(`[INFO] ${redacted}${formatData(data)}\n`);
  },

  debug(msg: string, data?: unknown): void {
    if (!shouldLog('debug')) return;
    const redacted = redactSecrets(msg);
    process.stdout.write(`[DEBUG] ${redacted}${formatData(data)}\n`);
  },
};
