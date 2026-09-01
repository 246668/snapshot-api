import { describe, expect, it } from 'vitest';
import { jsonError, pngResponse } from '../../netlify/functions/lib/response.js';

describe('response helpers', () => {
  it('returns a PNG cached at the CDN for 14 days', () => {
    const response = pngResponse(new Uint8Array([137, 80, 78, 71]));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('content-length')).toBe('4');
    expect(response.headers.get('cache-control')).toBe('public, max-age=0, s-maxage=1209600');
    expect(response.headers.get('vary')).toBe('Origin, Referer');
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
