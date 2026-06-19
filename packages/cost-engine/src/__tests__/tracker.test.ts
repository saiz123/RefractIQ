import { describe, it, expect } from 'vitest';
import { RunCostTracker } from '../tracker.js';
import type { StageSpend } from '../tracker.js';

function makeEntry(overrides: Partial<StageSpend> = {}): StageSpend {
  return {
    stage: 'build',
    iteration: 0,
    provider: 'anthropic',
    model: 'claude-3-5-sonnet',
    inputTokens: 1000,
    outputTokens: 500,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costUsd: 0.0042,
    durationMs: 1200,
    ...overrides,
  };
}

describe('RunCostTracker', () => {
  it('totalCostUsd() is 0 on a fresh tracker', () => {
    const tracker = new RunCostTracker();
    expect(tracker.totalCostUsd()).toBe(0);
  });

  it('totalCostUsd() equals sum of recorded costs', () => {
    const tracker = new RunCostTracker();
    tracker.record(makeEntry({ costUsd: 0.01 }));
    tracker.record(makeEntry({ costUsd: 0.02 }));
    tracker.record(makeEntry({ costUsd: 0.03 }));
    expect(tracker.totalCostUsd()).toBeCloseTo(0.06, 10);
  });

  it('totalInputTokens() accumulates correctly', () => {
    const tracker = new RunCostTracker();
    tracker.record(makeEntry({ inputTokens: 1000 }));
    tracker.record(makeEntry({ inputTokens: 2000 }));
    expect(tracker.totalInputTokens()).toBe(3000);
  });

  it('totalOutputTokens() accumulates correctly', () => {
    const tracker = new RunCostTracker();
    tracker.record(makeEntry({ outputTokens: 500 }));
    tracker.record(makeEntry({ outputTokens: 750 }));
    expect(tracker.totalOutputTokens()).toBe(1250);
  });

  it('toReportRows() formats costUsd as "$0.0042" style string', () => {
    const tracker = new RunCostTracker();
    tracker.record(makeEntry({ costUsd: 0.0042 }));
    const rows = tracker.toReportRows();
    expect(rows[0].costUsd).toBe('$0.0042');
  });

  it('toReportRows() appends [1] to stage name when iteration > 0', () => {
    const tracker = new RunCostTracker();
    tracker.record(makeEntry({ stage: 'repair', iteration: 1 }));
    const rows = tracker.toReportRows();
    expect(rows[0].stage).toBe('repair[1]');
  });

  it('toReportRows() does not append suffix when iteration === 0', () => {
    const tracker = new RunCostTracker();
    tracker.record(makeEntry({ stage: 'build', iteration: 0 }));
    const rows = tracker.toReportRows();
    expect(rows[0].stage).toBe('build');
  });

  it('getEntries() returns readonly array with all recorded entries', () => {
    const tracker = new RunCostTracker();
    const entry1 = makeEntry({ costUsd: 0.01 });
    const entry2 = makeEntry({ costUsd: 0.02 });
    tracker.record(entry1);
    tracker.record(entry2);
    const entries = tracker.getEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual(entry1);
    expect(entries[1]).toEqual(entry2);
  });
});
