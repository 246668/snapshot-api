import { describe, expect, it } from 'vitest';
import { resolveBrowserExecutable } from '../../netlify/functions/lib/browser.js';

describe('resolveBrowserExecutable', () => {
  it('uses a configured executable only when it exists', () => {
    expect(resolveBrowserExecutable('/chrome', (path) => path === '/chrome')).toEqual({
      executablePath: '/chrome',
      useLocalExecutable: true,
    });
  });

  it('falls back to serverless Chromium when the configured path does not exist', () => {
    expect(resolveBrowserExecutable('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', () => false)).toEqual({
      useLocalExecutable: false,
    });
  });
});
