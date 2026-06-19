import { describe, it, expect } from 'vitest';
import { CacheAwareMessageBuilder } from '../cache.js';

describe('CacheAwareMessageBuilder', () => {
  it('build("sys") with no sections returns { systemPrompt: "sys", messages: [] }', () => {
    const builder = new CacheAwareMessageBuilder();
    const result = builder.build('sys');
    expect(result.systemPrompt).toBe('sys');
    expect(result.messages).toEqual([]);
  });

  it('addStable("ctx").build("sys") merges stable content into systemPrompt', () => {
    const builder = new CacheAwareMessageBuilder();
    const result = builder.addStable('ctx').build('sys');
    expect(result.systemPrompt).toContain('sys');
    expect(result.systemPrompt).toContain('ctx');
    expect(result.messages).toEqual([]);
  });

  it('addVariable("task").build("sys") puts variable content in messages[0].content', () => {
    const builder = new CacheAwareMessageBuilder();
    const result = builder.addVariable('task').build('sys');
    expect(result.systemPrompt).toBe('sys');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toBe('task');
    expect(result.messages[0].role).toBe('user');
  });

  it('addStable("ctx").addVariable("task").build("sys") → systemPrompt includes ctx, messages has task', () => {
    const builder = new CacheAwareMessageBuilder();
    const result = builder.addStable('ctx').addVariable('task').build('sys');
    expect(result.systemPrompt).toContain('sys');
    expect(result.systemPrompt).toContain('ctx');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toBe('task');
  });

  it('estimateTokens() returns non-zero after adding sections', () => {
    const builder = new CacheAwareMessageBuilder();
    builder.addStable('hello world');
    expect(builder.estimateTokens()).toBeGreaterThan(0);
  });

  it('builder is chainable — addStable and addVariable return this', () => {
    const builder = new CacheAwareMessageBuilder();
    const result = builder.addStable('a').addVariable('b').addStable('c');
    expect(result).toBe(builder);
  });

  it('stable sections do not appear in messages', () => {
    const builder = new CacheAwareMessageBuilder();
    const result = builder.addStable('stable-content').build('sys');
    expect(result.messages).toEqual([]);
  });

  it('multiple variable sections are joined in messages[0]', () => {
    const builder = new CacheAwareMessageBuilder();
    const result = builder.addVariable('part1').addVariable('part2').build('sys');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toContain('part1');
    expect(result.messages[0].content).toContain('part2');
  });
});
