import { describe, expect, it } from 'vitest';

const baseUrl = process.env.SCREENSHOT_E2E_BASE_URL;
const allowedOrigin = process.env.SCREENSHOT_E2E_ALLOWED_ORIGIN;
const e2e = baseUrl && allowedOrigin ? describe : describe.skip;

const sourceHeaders = allowedOrigin ? { origin: allowedOrigin } : undefined;

e2e('screenshot API', () => {
  it('returns an 800x600 PNG from a 1600x1200 desktop viewport for a public target', async () => {
    const response = await fetch(`${baseUrl}/api/https://example.com`, {
      headers: sourceHeaders,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');

    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes.subarray(0, 8)).toEqual(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(readPngDimension(bytes, 16)).toBe(800);
    expect(readPngDimension(bytes, 20)).toBe(600);
  });

  it('rejects a private target', async () => {
    const response = await fetch(`${baseUrl}/api/http://127.0.0.1`, {
      headers: sourceHeaders,
    });

    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});

function readPngDimension(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset);
}
