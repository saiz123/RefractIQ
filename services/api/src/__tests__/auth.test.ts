import { describe, it, expect, afterEach } from 'vitest';
import { app } from '../app.js';

describe('API authentication', () => {
  const originalToken = process.env['REFRACTIQ_API_TOKEN'];

  afterEach(() => {
    if (originalToken !== undefined) {
      process.env['REFRACTIQ_API_TOKEN'] = originalToken;
    } else {
      delete process.env['REFRACTIQ_API_TOKEN'];
    }
  });

  it('returns 200 on /api/health with no auth configured', async () => {
    delete process.env['REFRACTIQ_API_TOKEN'];
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
  });

  it('returns 200 on /api/health even when auth is configured (health is unprotected)', async () => {
    process.env['REFRACTIQ_API_TOKEN'] = 'test-token-123';
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
  });

  it('returns 401 when token is set and request has no Authorization header', async () => {
    process.env['REFRACTIQ_API_TOKEN'] = 'test-token-abc';
    const res = await app.request('/api/providers');
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is set and wrong token provided', async () => {
    process.env['REFRACTIQ_API_TOKEN'] = 'correct-token';
    const res = await app.request('/api/providers', {
      headers: { Authorization: 'Bearer wrong-token' },
    });
    expect(res.status).toBe(401);
  });

  it('returns non-401 when correct bearer token is provided', async () => {
    process.env['REFRACTIQ_API_TOKEN'] = 'my-secret-token';
    const res = await app.request('/api/providers', {
      headers: { Authorization: 'Bearer my-secret-token' },
    });
    // May be 200 or 500 depending on DB state, but not 401
    expect(res.status).not.toBe(401);
  });
});
