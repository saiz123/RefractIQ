import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ProviderConfig } from './types/provider.js';
import type { TaskType } from './types/index.js';
import { InitError } from './errors.js';

export interface TaskOverride {
  preferredProvider?: string;
  preferredModel?: string;
}

export interface RefractIQConfig {
  version: string;
  providers: ProviderConfig[];
  budget: { defaultRunUsd: number };
  tiers: {
    cheap: { tasks: string[] };
    mid: { tasks: string[] };
    strong: { tasks: string[] };
  };
  security: { allowedCommands: string[] };
  taskOverrides?: Partial<Record<TaskType, TaskOverride>>;
}

export function getRefractIQDir(cwd?: string): string {
  return join(cwd ?? process.cwd(), '.refractiq');
}

// Keep old name as alias for backward compat during transition
export const getAgentForgeDir = getRefractIQDir;

export function loadConfig(refractiqDir: string): RefractIQConfig {
  const configPath = join(refractiqDir, 'config.json');
  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch {
    throw new InitError(
      `No RefractIQ config found at "${configPath}". Run "refractiq init" first.`
    );
  }
  return JSON.parse(raw) as RefractIQConfig;
}

export function saveConfig(agentForgeDir: string, config: RefractIQConfig): void {
  const configPath = join(agentForgeDir, 'config.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}
