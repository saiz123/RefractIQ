import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { DbClient } from './client.js';
import { runs, runStages } from './schema.js';
import type { RunResult } from '@agentforge/shared';

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
