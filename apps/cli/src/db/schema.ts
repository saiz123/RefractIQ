import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(),
  status: text('status').notNull(), // 'running' | 'complete' | 'failed' | 'aborted'
  userPrompt: text('user_prompt').notNull(),
  createdAt: integer('created_at').notNull(),
  completedAt: integer('completed_at'),
  totalInputTokens: integer('total_input_tokens').notNull().default(0),
  totalOutputTokens: integer('total_output_tokens').notNull().default(0),
  totalCostUsd: real('total_cost_usd').notNull().default(0),
  outputPath: text('output_path').notNull().default(''),
});

export const runStages = sqliteTable('run_stages', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull(),
  stage: text('stage').notNull(),
  iteration: integer('iteration').notNull().default(0),
  status: text('status').notNull(),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
  provider: text('provider').notNull().default(''),
  model: text('model').notNull().default(''),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  costUsd: real('cost_usd').notNull().default(0),
});
