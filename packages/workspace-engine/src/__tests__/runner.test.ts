import { describe, it, expect } from 'vitest';
import { createSanitizedEnv } from '../security.js';

describe('createSanitizedEnv', () => {
  it('does not pass ANTHROPIC_API_KEY to child process env', () => {
    const originalKey = process.env['ANTHROPIC_API_KEY'];
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test-key-12345678901234567890';

    const env = createSanitizedEnv();
    expect(env['ANTHROPIC_API_KEY']).toBeUndefined();

    // Restore
    if (originalKey !== undefined) process.env['ANTHROPIC_API_KEY'] = originalKey;
    else delete process.env['ANTHROPIC_API_KEY'];
  });

  it('does not pass OPENAI_API_KEY to child process env', () => {
    const originalKey = process.env['OPENAI_API_KEY'];
    process.env['OPENAI_API_KEY'] = 'sk-test-key-12345678901234567890';

    const env = createSanitizedEnv();
    expect(env['OPENAI_API_KEY']).toBeUndefined();

    if (originalKey !== undefined) process.env['OPENAI_API_KEY'] = originalKey;
    else delete process.env['OPENAI_API_KEY'];
  });

  it('passes through safe PATH env var', () => {
    const originalPath = process.env['PATH'];
    process.env['PATH'] = '/usr/bin:/bin';

    const env = createSanitizedEnv();
    expect(env['PATH']).toBe('/usr/bin:/bin');

    if (originalPath !== undefined) process.env['PATH'] = originalPath;
    else delete process.env['PATH'];
  });

  it('merges extra vars into result', () => {
    const env = createSanitizedEnv({ MY_CUSTOM_VAR: 'hello' });
    expect(env['MY_CUSTOM_VAR']).toBe('hello');
  });

  it('does not pass TOKEN-suffixed vars', () => {
    const originalKey = process.env['SOME_TOKEN'];
    process.env['SOME_TOKEN'] = 'secret-token-value';

    const env = createSanitizedEnv();
    expect(env['SOME_TOKEN']).toBeUndefined();

    if (originalKey !== undefined) process.env['SOME_TOKEN'] = originalKey;
    else delete process.env['SOME_TOKEN'];
  });
});
