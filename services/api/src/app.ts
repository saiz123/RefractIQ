import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { eq } from 'drizzle-orm';
import { join } from 'node:path';
import { openDb, runs, runStages } from './db.js';

const AGENTFORGE_DIR = process.env['AGENTFORGE_DIR'] ?? join(process.cwd(), '.agentforge');

export const app = new Hono();

app.use('/*', cors({ origin: 'http://localhost:3000' }));

// Auth middleware reads token per-request so tests can change process.env between calls.
// /api/health is exempt from auth — it is always public.
app.use('/api/*', async (c, next) => {
  if (c.req.path === '/api/health') {
    await next();
    return;
  }
  const token = process.env['AGENTFORGE_API_TOKEN'];
  if (!token) {
    await next();
    return;
  }
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${token}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
});

app.get('/api/health', (c) => c.json({ ok: true, version: '0.1.0' }));

app.get('/api/runs', async (c) => {
  try {
    const db = openDb(AGENTFORGE_DIR);
    const allRuns = await db.select().from(runs).all();
    return c.json(allRuns.reverse());
  } catch {
    return c.json({ error: 'Database unavailable' }, 500);
  }
});

app.get('/api/runs/:id', async (c) => {
  try {
    const db = openDb(AGENTFORGE_DIR);
    const id = c.req.param('id');
    const run = await db.select().from(runs).where(eq(runs.id, id)).get();
    if (!run) return c.json({ error: 'Not found' }, 404);
    const stages = await db.select().from(runStages).where(eq(runStages.runId, id)).all();
    return c.json({ run, stages });
  } catch {
    return c.json({ error: 'Database unavailable' }, 500);
  }
});

app.get('/api/providers', async (c) => {
  try {
    const { readFileSync } = await import('node:fs');
    const config = JSON.parse(readFileSync(join(AGENTFORGE_DIR, 'config.json'), 'utf8')) as {
      providers?: unknown[];
    };
    return c.json(config.providers ?? []);
  } catch {
    return c.json([]);
  }
});
