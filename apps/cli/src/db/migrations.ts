import type { Client } from '@libsql/client';

interface Migration {
  version: number;
  description: string;
  sql: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'v0.1.0 baseline schema',
    sql: '', // already applied by ensureSchema — just marks the baseline
  },
  {
    version: 2,
    description: 'v0.2.0 prompt cache columns',
    sql: [
      'ALTER TABLE run_stages ADD COLUMN cache_read_tokens INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE run_stages ADD COLUMN cache_write_tokens INTEGER NOT NULL DEFAULT 0',
    ].join(';'),
  },
];

export async function runMigrations(client: Client): Promise<void> {
  // Create schema_version table if it doesn't exist
  await client.execute(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL,
      description TEXT NOT NULL DEFAULT ''
    )
  `);

  // Get current version
  const result = await client.execute('SELECT MAX(version) as v FROM schema_version');
  const currentVersion = (result.rows[0]?.['v'] as number | null) ?? 0;

  // Apply pending migrations in order
  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      if (migration.sql) {
        // Execute each SQL statement separately (libsql doesn't support multiple statements in one execute call)
        const statements = migration.sql
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean);
        for (const stmt of statements) {
          try {
            await client.execute(stmt);
          } catch (err) {
            // Ignore "duplicate column" errors for idempotency on re-run
            const msg = String(err);
            if (!msg.includes('duplicate column') && !msg.includes('already exists')) {
              throw err;
            }
          }
        }
      }
      await client.execute({
        sql: 'INSERT OR REPLACE INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)',
        args: [migration.version, Date.now(), migration.description],
      });
    }
  }
}
