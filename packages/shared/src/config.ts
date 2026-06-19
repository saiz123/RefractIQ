import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ProviderConfig } from './types/provider.js';
import { InitError } from './errors.js';

export interface AgentForgeConfig {
  version: string;
  providers: ProviderConfig[];
  budget: { defaultRunUsd: number };
  tiers: {
    cheap: { tasks: string[] };
    mid: { tasks: string[] };
    strong: { tasks: string[] };
  };
  security: { allowedCommands: string[] };
}

export function getAgentForgeDir(cwd?: string): string {
  return join(cwd ?? process.cwd(), '.agentforge');
}

export function loadConfig(agentForgeDir: string): AgentForgeConfig {
  const configPath = join(agentForgeDir, 'config.json');
  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch {
    throw new InitError(
      `No AgentForge config found at "${configPath}". Run "agentforge init" first.`,
    );
  }
  return JSON.parse(raw) as AgentForgeConfig;
}

export function saveConfig(agentForgeDir: string, config: AgentForgeConfig): void {
  const configPath = join(agentForgeDir, 'config.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}
