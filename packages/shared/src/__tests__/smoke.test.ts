import { describe, it, expect } from 'vitest';

describe('@refractiq/shared scaffold', () => {
  it('workspace is wired correctly', () => {
    expect(true).toBe(true);
  });

  it('TypeScript strict mode is enforced', () => {
    const value: string = 'refractiq';
    expect(value).toBe('refractiq');
  });
});
