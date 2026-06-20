import type { TaskType, TaskTier, Capability } from '@refractiq/shared';

export const TASK_TIERS: Record<TaskType, TaskTier> = {
  intake: 'cheap',
  summarize: 'cheap',
  doc: 'cheap',
  architect: 'mid',
  review: 'mid',
  build: 'strong',
  repair: 'strong',
};

export const TASK_CAPABILITIES: Record<TaskType, Capability[]> = {
  intake: ['json', 'fast'],
  summarize: ['fast'],
  doc: ['fast'],
  architect: ['reasoning', 'json'],
  review: ['code', 'json'],
  build: ['code', 'json'],
  repair: ['code', 'json'],
};
