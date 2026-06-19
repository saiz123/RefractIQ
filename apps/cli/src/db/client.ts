import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { join } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import { getAgentForgeDir, InitError } from '@agentforge/shared';
import * as schema from './schema.js';

export type DbClient = ReturnType<typeof drizzle<typeof schema>>;

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    user_prompt TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    completed_at INTEGER,
    total_input_tokens INTEGER NOT NULL DEFAULT 0,
    total_output_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost_usd REAL NOT NULL DEFAULT 0,
    output_path TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS run_stages (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    stage TEXT NOT NULL,
    iteration INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    provider TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd REAL NOT NULL DEFAULT 0
  );
`;

function makeClient(dbPath: string): Client {
  return createClient({ url: `file:${dbPath}` });
}

export function openDb(cwd?: string): DbClient {
  const agentForgeDir = getAgentForgeDir(cwd);
  const dbPath = join(agentForgeDir, 'agentforge.db');

  if (!existsSync(dbPath)) {
    throw new InitError(`Database not found at "${dbPath}". Run "agentforge init" first.`);
  }

  const client = makeClient(dbPath);
  // Ensure schema is present (idempotent, handles legacy empty-file DBs)
  void client.executeMultiple(SCHEMA_SQL);
  return drizzle(client, { schema });
}

export async function openDbAsync(cwd?: string): Promise<DbClient> {
  const agentForgeDir = getAgentForgeDir(cwd);
  const dbPath = join(agentForgeDir, 'agentforge.db');

  if (!existsSync(dbPath)) {
    throw new InitError(`Database not found at "${dbPath}". Run "agentforge init" first.`);
  }

  const client = makeClient(dbPath);
  await client.executeMultiple(SCHEMA_SQL);
  return drizzle(client, { schema });
}

export async function createDb(agentForgeDir: string): Promise<void> {
  const dbPath = join(agentForgeDir, 'agentforge.db');
  if (!existsSync(dbPath)) {
    writeFileSync(dbPath, '');
  }
  const client = makeClient(dbPath);
  await client.executeMultiple(SCHEMA_SQL);
  client.close();
}
