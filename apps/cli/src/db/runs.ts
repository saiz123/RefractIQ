import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { DbClient } from './client.js';
import { runs, runStages } from './schema.js';
import type { RunResult } from '@refractiq/shared';

export async function saveRun(db: DbClient, result: RunResult): Promise<void> {
  await db.insert(runs).values({
    id: result.id,
    status: result.status,
    userPrompt: result.userPrompt,
    createdAt: Date.now() - result.durationMs,
    completedAt: Date.now(),
    totalInputTokens: result.totalInputTokens,
    totalOutputTokens: result.totalOutputTokens,
    totalCostUsd: result.totalCostUsd,
    outputPath: result.outputPath,
  });

  for (const stage of result.stages) {
    await db.insert(runStages).values({
      id: randomUUID(),
      runId: result.id,
      stage: stage.stage,
      iteration: stage.iteration,
      status: stage.status,
      startedAt: Date.now() - stage.durationMs,
      endedAt: Date.now(),
      provider: stage.provider ?? '',
      model: stage.model ?? '',
      inputTokens: stage.inputTokens,
      outputTokens: stage.outputTokens,
      cacheReadTokens: stage.cacheReadTokens ?? 0,
      cacheWriteTokens: stage.cacheWriteTokens ?? 0,
      costUsd: stage.costUsd,
    });
  }
}

export async function listRuns(db: DbClient, limit = 10) {
  const all = await db.select().from(runs);
  return all.slice(-limit);
}

export async function getRunWithStages(db: DbClient, runId: string) {
  const runRows = await db.select().from(runs).where(eq(runs.id, runId));
  const run = runRows[0];
  if (!run) return null;
  const stages = await db.select().from(runStages).where(eq(runStages.runId, runId));
  return { run, stages };
}

export async function getAverageLatencyByModel(db: DbClient): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  try {
    const rows = await db.select().from(runStages);
    // Group and average in JS (simpler than raw SQL aggregation with Drizzle)
    const byModel: Record<string, number[]> = {};
    for (const row of rows) {
      if (row.model && row.endedAt && row.startedAt) {
        const latency = row.endedAt - row.startedAt;
        if (!byModel[row.model]) byModel[row.model] = [];
        byModel[row.model]!.push(latency);
      }
    }
    for (const [model, latencies] of Object.entries(byModel)) {
      map[model] = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    }
  } catch {
    // Silently return empty map — latency routing is optional
  }
  return map;
}
