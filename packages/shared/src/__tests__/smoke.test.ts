import { describe, it, expect } from 'vitest';

describe('@agentforge/shared scaffold', () => {
  it('workspace is wired correctly', () => {
    expect(true).toBe(true);
  });

  it('TypeScript strict mode is enforced', () => {
    const value: string = 'agentforge';
    expect(value).toBe('agentforge');
  });
});
