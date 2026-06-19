import { describe, it, expect } from 'vitest';
import { estimateTokens, estimateMessagesTokens, estimateJsonTokens } from '../counter.js';

describe('estimateTokens', () => {
  it('returns 0 for an empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('returns 1 for a 4-character string', () => {
    expect(estimateTokens('abcd')).toBe(1);
  });

  it('returns 2 for an 8-character string', () => {
    expect(estimateTokens('abcdefgh')).toBe(2);
  });

  it('handles non-ASCII characters (emoji) without crashing and returns > 0', () => {
    const result = estimateTokens('😀😀');
    expect(result).toBeGreaterThan(0);
  });
});

describe('estimateMessagesTokens', () => {
  it('returns 0 for an empty array', () => {
    expect(estimateMessagesTokens([])).toBe(0);
  });

  it('returns content tokens + 4 overhead for a single message with 8 chars', () => {
    const messages = [{ role: 'user' as const, content: 'abcdefgh' }];
    // 8 chars / 4 = 2 tokens + 4 overhead = 6
    expect(estimateMessagesTokens(messages)).toBe(6);
  });

  it('accumulates tokens for two messages independently', () => {
    const messages = [
      { role: 'user' as const, content: 'abcdefgh' }, // 2 content + 4 overhead = 6
      { role: 'assistant' as const, content: 'abcd' }, // 1 content + 4 overhead = 5
    ];
    expect(estimateMessagesTokens(messages)).toBe(11);
  });
});

describe('estimateJsonTokens', () => {
  it('estimates tokens for a simple object via JSON.stringify', () => {
    const obj = { key: 'value' };
    const serialized = JSON.stringify(obj);
    const expected = Math.ceil(serialized.length / 4);
    expect(estimateJsonTokens(obj)).toBe(expected);
  });

  it('returns 0 for an empty string serialization context', () => {
    // JSON.stringify('') = '""' which is 2 chars → ceil(2/4) = 1
    expect(estimateJsonTokens('')).toBe(1);
  });

  it('handles nested objects without crashing', () => {
    const obj = { a: { b: { c: 42 } } };
    expect(estimateJsonTokens(obj)).toBeGreaterThan(0);
  });
});
