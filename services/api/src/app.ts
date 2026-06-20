import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { eq } from 'drizzle-orm';
import { join } from 'node:path';
import { openDb, runs, runStages } from './db.js';

const REFRACTIQ_DIR = process.env['REFRACTIQ_DIR'] ?? join(process.cwd(), '.refractiq');

export const app = new Hono();

app.use('/*', cors({ origin: 'http://localhost:3000' }));

// Auth middleware reads token per-request so tests can change process.env between calls.
// /api/health is exempt from auth — it is always public.
app.use('/api/*', async (c, next) => {
  if (c.req.path === '/api/health') {
    await next();
    return;
  }
  const token = process.env['REFRACTIQ_API_TOKEN'];
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
    const db = openDb(REFRACTIQ_DIR);
    const allRuns = await db.select().from(runs).all();
    return c.json(allRuns.reverse());
  } catch {
    return c.json({ error: 'Database unavailable' }, 500);
  }
});

app.get('/api/runs/:id', async (c) => {
  try {
    const db = openDb(REFRACTIQ_DIR);
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
    const config = JSON.parse(readFileSync(join(REFRACTIQ_DIR, 'config.json'), 'utf8')) as {
      providers?: unknown[];
    };
    return c.json(config.providers ?? []);
  } catch {
    return c.json([]);
  }
});

app.get('/api/stats', async (c) => {
  try {
    const db = openDb(REFRACTIQ_DIR);
    const allRuns = await db.select().from(runs).all();
    const allStages = await db.select().from(runStages).all();

    const totalRuns = allRuns.length;
    const totalCost = allRuns.reduce((s, r) => s + r.totalCostUsd, 0);
    const avgCost = totalRuns > 0 ? totalCost / totalRuns : 0;
    const totalTokens = allRuns.reduce((s, r) => s + r.totalInputTokens + r.totalOutputTokens, 0);
    const byStatus = allRuns.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Top providers used
    const providerCounts: Record<string, number> = {};
    for (const s of allStages) {
      if (s.provider) providerCounts[s.provider] = (providerCounts[s.provider] ?? 0) + 1;
    }

    return c.json({
      totalRuns,
      totalCost,
      avgCost,
      totalTokens,
      byStatus,
      topProviders: providerCounts,
    });
  } catch {
    return c.json({
      totalRuns: 0,
      totalCost: 0,
      avgCost: 0,
      totalTokens: 0,
      byStatus: {},
      topProviders: {},
    });
  }
});

app.get('/api/providers/stats', async (c) => {
  try {
    const db = openDb(REFRACTIQ_DIR);
    const allStages = await db.select().from(runStages).all();

    // Group by provider + model
    const byModel: Record<
      string,
      {
        provider: string;
        model: string;
        callCount: number;
        totalCost: number;
        totalInputTokens: number;
        totalOutputTokens: number;
        totalLatency: number;
        cacheReadTokens: number;
      }
    > = {};

    for (const s of allStages) {
      if (!s.provider || !s.model) continue;
      const key = `${s.provider}/${s.model}`;
      if (!byModel[key]) {
        byModel[key] = {
          provider: s.provider,
          model: s.model,
          callCount: 0,
          totalCost: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalLatency: 0,
          cacheReadTokens: 0,
        };
      }
      const entry = byModel[key]!;
      entry.callCount++;
      entry.totalCost += s.costUsd;
      entry.totalInputTokens += s.inputTokens;
      entry.totalOutputTokens += s.outputTokens;
      entry.totalLatency += (s.endedAt ?? s.startedAt) - s.startedAt;
      entry.cacheReadTokens += s.cacheReadTokens ?? 0;
    }

    const result = Object.values(byModel)
      .map((e) => ({
        provider: e.provider,
        model: e.model,
        callCount: e.callCount,
        avgCost: e.callCount > 0 ? e.totalCost / e.callCount : 0,
        avgInputTokens: e.callCount > 0 ? Math.round(e.totalInputTokens / e.callCount) : 0,
        avgLatencyMs: e.callCount > 0 ? Math.round(e.totalLatency / e.callCount) : 0,
        cacheReadTokens: e.cacheReadTokens,
      }))
      .sort((a, b) => b.callCount - a.callCount);

    return c.json(result);
  } catch {
    return c.json([]);
  }
});
