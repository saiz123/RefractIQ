import { describe, it, expect } from 'vitest';
import { createClient } from '@libsql/client';
import { runMigrations } from '../migrations.js';

describe('runMigrations', () => {
  it('creates schema_version table and applies all migrations', async () => {
    const client = createClient({ url: ':memory:' });
    // Create baseline tables first (simulate ensureSchema)
    await client.execute(`CREATE TABLE IF NOT EXISTS run_stages (
      id TEXT PRIMARY KEY, run_id TEXT, stage TEXT NOT NULL,
      iteration INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL,
      started_at INTEGER NOT NULL, ended_at INTEGER,
      provider TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '',
      input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0
    )`);

    await runMigrations(client);

    const result = await client.execute('SELECT version FROM schema_version ORDER BY version');
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    expect(result.rows[result.rows.length - 1]?.['version']).toBe(2);
  });

  it('is idempotent — running twice does not error', async () => {
    const client = createClient({ url: ':memory:' });
    await client.execute(`CREATE TABLE IF NOT EXISTS run_stages (
      id TEXT PRIMARY KEY, run_id TEXT, stage TEXT NOT NULL,
      iteration INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL,
      started_at INTEGER NOT NULL, ended_at INTEGER,
      provider TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '',
      input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0
    )`);
    await runMigrations(client);
    await expect(runMigrations(client)).resolves.not.toThrow();
  });
});
