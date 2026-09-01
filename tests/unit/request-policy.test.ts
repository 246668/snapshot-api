import { describe, expect, it } from 'vitest';
import { evaluateBrowserSource, isOriginCheckDisabled } from '../../netlify/functions/lib/request-policy.js';

describe('isOriginCheckDisabled', () => {
  it('only enables the bypass for the explicit true value', () => {
    expect(isOriginCheckDisabled('true')).toBe(true);
    expect(isOriginCheckDisabled('TRUE')).toBe(true);
    expect(isOriginCheckDisabled(' false ')).toBe(false);
    expect(isOriginCheckDisabled(undefined)).toBe(false);
  });
});

describe('evaluateBrowserSource', () => {
  it('allows a request from an allowlisted referer', () => {
    const request = new Request('https://snapshot.example/api/https://example.com', {
      headers: { referer: 'http://localhost:4321/page' },
    });

    expect(evaluateBrowserSource(request, 'http://localhost:4321')).toEqual({ allowed: true });
  });

  it('rejects a request without an allowed browser source by default', () => {
    const request = new Request('https://snapshot.example/api/https://example.com');

    expect(evaluateBrowserSource(request, 'http://localhost:4321')).toEqual({
      allowed: false,
      reason: 'request_not_allowed',
    });
  });

  it('bypasses browser-source validation when explicitly disabled', () => {
    const request = new Request('https://snapshot.example/api/https://example.com');

    expect(evaluateBrowserSource(request, undefined, 'true')).toEqual({ allowed: true });
  });
});
