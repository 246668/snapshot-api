import { describe, expect, it } from 'vitest';
import { parseTargetUrl, TargetUrlError } from '../../netlify/functions/lib/target-url.js';

describe('parseTargetUrl', () => {
  it('accepts the raw URL route form', () => {
    const target = parseTargetUrl('https://snapshot.example/api/https://google.com');

    expect(target.href).toBe('https://google.com/');
  });

  it('accepts a once-encoded target URL', () => {
    const target = parseTargetUrl(
      'https://snapshot.example/api/https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dnetlify',
    );

    expect(target.href).toBe('https://example.com/search?q=netlify');
  });

  it.each([
    'https://snapshot.example/api/not-a-url',
    'https://snapshot.example/api/%E0%A4%A',
    'https://snapshot.example/api/',
  ])('rejects malformed input: %s', (requestUrl) => {
    expect(() => parseTargetUrl(requestUrl)).toThrow(TargetUrlError);
  });

  it.each([
    ['file', 'file:///etc/passwd'],
    ['data', 'data:text/html,hello'],
    ['credentials', 'https://user:password@example.com'],
    ['unapproved port', 'https://example.com:8080'],
  ])('rejects %s', (_name, target) => {
    expect(() => parseTargetUrl(`https://snapshot.example/api/${encodeURIComponent(target)}`)).toThrow(
      TargetUrlError,
    );
  });
});
