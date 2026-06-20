import { describe, it, expect } from 'vitest';
import { TASK_TIERS, TASK_CAPABILITIES } from '../tiers.js';
import type { TaskType } from '@refractiq/shared';

const ALL_TASK_TYPES: TaskType[] = [
  'intake',
  'summarize',
  'doc',
  'architect',
  'review',
  'build',
  'repair',
];

describe('TASK_TIERS', () => {
  it('every TaskType has an entry in TASK_TIERS', () => {
    for (const taskType of ALL_TASK_TYPES) {
      expect(TASK_TIERS).toHaveProperty(taskType);
    }
  });

  it('intake maps to cheap', () => {
    expect(TASK_TIERS.intake).toBe('cheap');
  });

  it('build maps to strong', () => {
    expect(TASK_TIERS.build).toBe('strong');
  });

  it('architect maps to mid', () => {
    expect(TASK_TIERS.architect).toBe('mid');
  });

  it('summarize maps to cheap', () => {
    expect(TASK_TIERS.summarize).toBe('cheap');
  });

  it('doc maps to cheap', () => {
    expect(TASK_TIERS.doc).toBe('cheap');
  });

  it('review maps to mid', () => {
    expect(TASK_TIERS.review).toBe('mid');
  });

  it('repair maps to strong', () => {
    expect(TASK_TIERS.repair).toBe('strong');
  });
});

describe('TASK_CAPABILITIES', () => {
  it('every TaskType has an entry in TASK_CAPABILITIES', () => {
    for (const taskType of ALL_TASK_TYPES) {
      expect(TASK_CAPABILITIES).toHaveProperty(taskType);
    }
  });

  it('build requires code and json capabilities', () => {
    expect(TASK_CAPABILITIES.build).toContain('code');
    expect(TASK_CAPABILITIES.build).toContain('json');
  });

  it('intake requires json and fast capabilities', () => {
    expect(TASK_CAPABILITIES.intake).toContain('json');
    expect(TASK_CAPABILITIES.intake).toContain('fast');
  });

  it('architect requires reasoning and json capabilities', () => {
    expect(TASK_CAPABILITIES.architect).toContain('reasoning');
    expect(TASK_CAPABILITIES.architect).toContain('json');
  });
});
