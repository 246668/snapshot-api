import { describe, expect, it } from 'vitest';
import { jsonError, pngResponse } from '../../netlify/functions/lib/response.js';

describe('response helpers', () => {
  it('returns a cacheable PNG response', () => {
    const response = pngResponse(new Uint8Array([137, 80, 78, 71]));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('content-length')).toBe('4');
    expect(response.headers.get('cache-control')).toContain('s-maxage=86400');
  });

  it('returns a non-cacheable JSON error', async () => {
    const response = jsonError(403, 'target_not_allowed', 'The requested target is not allowed.');

    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      error: 'target_not_allowed',
      message: 'The requested target is not allowed.',
    });
  });
});
