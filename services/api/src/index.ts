import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { eq } from 'drizzle-orm';
import { join } from 'node:path';
import { openDb, runs, runStages } from './db.js';

const PORT = Number(process.env['PORT'] ?? 3001);
const AGENTFORGE_DIR = process.env['AGENTFORGE_DIR'] ?? join(process.cwd(), '.agentforge');
const API_TOKEN = process.env['AGENTFORGE_API_TOKEN'];

const db = openDb(AGENTFORGE_DIR);
const app = new Hono();

app.use('/*', cors({ origin: 'http://localhost:3000' }));

if (API_TOKEN) {
  app.use('/api/*', async (c, next) => {
    const auth = c.req.header('Authorization');
    if (auth !== `Bearer ${API_TOKEN}`) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
  });
}

app.get('/api/health', (c) => c.json({ ok: true, version: '0.1.0' }));

app.get('/api/runs', async (c) => {
  const allRuns = await db.select().from(runs).all();
  return c.json(allRuns.reverse()); // newest first
});

app.get('/api/runs/:id', async (c) => {
  const id = c.req.param('id');
  const run = await db.select().from(runs).where(eq(runs.id, id)).get();
  if (!run) return c.json({ error: 'Not found' }, 404);
  const stages = await db.select().from(runStages).where(eq(runStages.runId, id)).all();
  return c.json({ run, stages });
});

app.get('/api/providers', async (c) => {
  // Read providers from config.json in AGENTFORGE_DIR
  try {
    const { readFileSync } = await import('node:fs');
    const config = JSON.parse(readFileSync(join(AGENTFORGE_DIR, 'config.json'), 'utf8'));
    return c.json(config.providers ?? []);
  } catch {
    return c.json([]);
  }
});

console.log(`AgentForge API running at http://localhost:${PORT}`);
console.log(`Reading from: ${AGENTFORGE_DIR}`);

serve({ fetch: app.fetch, port: PORT });
