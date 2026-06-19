import { describe, it, expect } from 'vitest';
import { redactSecrets } from '../logger.js';

describe('redactSecrets', () => {
  it('passes through normal text unchanged', () => {
    const text = 'Hello, this is a normal log message.';
    expect(redactSecrets(text)).toBe(text);
  });

  it('redacts OpenAI key pattern', () => {
    const text = 'Using key sk-abcdefghijklmnopqrstuvwxyz1234567890 for request';
    const result = redactSecrets(text);
    expect(result).not.toContain('sk-abcdefghijklmnopqrstuvwxyz1234567890');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts Anthropic key pattern', () => {
    const text = 'API key: sk-ant-api03-abcdefghijklmnopqrstuvwxyz12345678901234567890';
    const result = redactSecrets(text);
    expect(result).not.toContain('sk-ant-api03-abcdefghijklmnopqrstuvwxyz12345678901234567890');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts Google/Gemini key pattern', () => {
    const text = 'Gemini key: AIzaSyAbcdefghijklmnopqrstuvwxyz12345678';
    const result = redactSecrets(text);
    expect(result).not.toContain('AIzaSyAbcdefghijklmnopqrstuvwxyz12345678');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts multiple secrets in the same string', () => {
    const text =
      'key1=sk-abcdefghijklmnopqrstuvwxyz1234567890 key2=sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890';
    const result = redactSecrets(text);
    expect(result).not.toContain('sk-abcdefghijklmnopqrstuvwxyz');
    expect(result.split('[REDACTED]').length - 1).toBeGreaterThanOrEqual(2);
  });

  it('does not modify an empty string', () => {
    expect(redactSecrets('')).toBe('');
  });
});
