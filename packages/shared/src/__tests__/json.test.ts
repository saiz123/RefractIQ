import { describe, it, expect } from 'vitest';
import { safeParseAgentJson } from '../utils/json.js';

describe('safeParseAgentJson', () => {
  it('parses plain JSON', () => {
    const result = safeParseAgentJson<{ x: number }>('{"x": 1}');
    expect(result.x).toBe(1);
  });

  it('strips json code fence', () => {
    const result = safeParseAgentJson<{ x: number }>('```json\n{"x": 1}\n```');
    expect(result.x).toBe(1);
  });

  it('strips plain code fence', () => {
    const result = safeParseAgentJson<{ x: number }>('```\n{"x": 1}\n```');
    expect(result.x).toBe(1);
  });

  it('throws on invalid JSON with preview', () => {
    expect(() => safeParseAgentJson('not json')).toThrow('Failed to parse agent JSON');
  });

  it('handles whitespace around fences', () => {
    const result = safeParseAgentJson<{ ok: boolean }>('  ```json  \n{"ok":true}\n```  ');
    expect(result.ok).toBe(true);
  });

  it('throws when required key is missing', () => {
    expect(() => safeParseAgentJson('{"x": 1}', ['x', 'y'])).toThrow('missing required field: "y"');
  });

  it('passes when all required keys are present', () => {
    const result = safeParseAgentJson<{x: number; y: string}>('{"x": 1, "y": "ok"}', ['x', 'y']);
    expect(result.x).toBe(1);
  });
});
